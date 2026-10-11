/* Copyright 2026 TheMakersWorkbench.com. Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE. */
/* TMWB Resistor Color Code logic. No dependencies. */
(function (root) {
  'use strict';

  var HEX = {
    black: '#111111', brown: '#7b4a1e', red: '#d62828', orange: '#f77f00', yellow: '#f6d90b',
    green: '#2a9d4b', blue: '#1d5fd1', violet: '#7a3fb5', grey: '#8d8d8d', white: '#f5f5f5',
    gold: '#cfa72a', silver: '#c2c6cc'
  };
  var DIGIT = { black: 0, brown: 1, red: 2, orange: 3, yellow: 4, green: 5, blue: 6, violet: 7, grey: 8, white: 9 };
  var MULT = { black: 0, brown: 1, red: 2, orange: 3, yellow: 4, green: 5, blue: 6, violet: 7, grey: 8, white: 9, gold: -1, silver: -2 };
  var TOL = { brown: 1, red: 2, green: 0.5, blue: 0.25, violet: 0.1, grey: 0.05, gold: 5, silver: 10 };
  var PPM = { black: 250, brown: 100, red: 50, orange: 15, yellow: 25, green: 20, blue: 10, violet: 5, grey: 1 };

  var ROLES = {
    3: ['digit', 'digit', 'mult'],
    4: ['digit', 'digit', 'mult', 'tol'],
    5: ['digit', 'digit', 'digit', 'mult', 'tol'],
    6: ['digit', 'digit', 'digit', 'mult', 'tol', 'ppm']
  };
  var TABLE = { digit: DIGIT, mult: MULT, tol: TOL, ppm: PPM };

  function pow10(e) { return Number('1e' + e); }
  function trim(x) { return Number(x.toPrecision(6)).toString(); }

  function formatOhms(v) {
    if (v === 0) return '0 Ω';
    var units = [[1e9, 'GΩ'], [1e6, 'MΩ'], [1e3, 'kΩ']];
    for (var i = 0; i < units.length; i++) {
      if (v >= units[i][0] * 0.9999999) return trim(v / units[i][0]) + ' ' + units[i][1];
    }
    return trim(v) + ' Ω';
  }

  /* bands: array of color names -> value info */
  function decode(bands) {
    var n = bands.length;
    if (n === 1 && bands[0] === 'black') {
      return { value: 0, tol: null, ppm: null, min: 0, max: 0, count: 1 };
    }
    var roles = ROLES[n];
    if (!roles) return { error: 'A resistor has 3 to 6 bands.' };
    var digits = '', mult = 0, tol = 20, ppm = null;
    for (var i = 0; i < n; i++) {
      var role = roles[i], c = bands[i];
      if (!(c in TABLE[role])) return { error: c + ' is not valid for band ' + (i + 1) + ' (' + role + ').' };
      var v = TABLE[role][c];
      if (role === 'digit') digits += v;
      else if (role === 'mult') mult = v;
      else if (role === 'tol') tol = v;
      else if (role === 'ppm') ppm = v;
    }
    var value = Number(digits + 'e' + mult);
    return { value: value, tol: tol, ppm: ppm, min: value * (1 - tol / 100), max: value * (1 + tol / 100), count: n };
  }

  /* Split value into D (n digits) x 10^m exactly, or null */
  function decompose(value, n) {
    var e = Math.floor(Math.log10(value));
    var m = e - (n - 1);
    var D = Math.round(value / pow10(m));
    if (D >= Math.pow(10, n)) { D = Math.round(D / 10); m++; }
    if (D < Math.pow(10, n - 1)) { D *= 10; m--; }
    if (Math.abs(D * pow10(m) - value) > value * 1e-9) return null;
    return { D: D, m: m };
  }

  function colorFor(table, val) {
    for (var k in table) if (Math.abs(table[k] - val) < 1e-9) return k;
    return null;
  }

  /* Text like "4.7kΩ 1%", "4k7", "220 5%", "10k 1% 50ppm" -> {value, tol, ppm} */
  function parseInput(str) {
    var s = String(str || '').trim();
    if (!s) return { error: 'Type a value, for example 4.7kΩ 1%' };
    var ppm = null, tol = null, m;
    if ((m = s.match(/(\d+(?:\.\d+)?)\s*ppm(?:\/\s*[k°]?[CK])?/i))) { ppm = Number(m[1]); s = s.replace(m[0], ' '); }
    if ((m = s.match(/[±+-]?\s*(\d+(?:\.\d+)?)\s*%/))) { tol = Number(m[1]); s = s.replace(m[0], ' '); }
    s = s.replace(/ohms?|Ω|Ω/gi, '').replace(/[\s,]/g, '');
    var value;
    if ((m = s.match(/^(\d*)([rkmgRKMG])(\d*)$/)) && (m[1] || m[3])) {
      value = Number((m[1] || '0') + '.' + (m[3] || '0')) * suffix(m[2]);
    } else if ((m = s.match(/^(\d+\.?\d*|\.\d+)([rkmgRKMG]?)$/))) {
      value = Number(m[1]) * suffix(m[2]);
    } else {
      return { error: 'Could not read that value. Try 4.7k, 4k7, 220, or 2.2M.' };
    }
    return { value: value, tol: tol, ppm: ppm };
  }
  function suffix(c) {
    c = (c || '').toLowerCase();
    return c === 'k' ? 1e3 : c === 'm' ? 1e6 : c === 'g' ? 1e9 : 1;
  }

  /* opts: {value, tol (percent or null), ppm (or null), count ('auto'|3|4|5|6)} */
  function encode(opts) {
    var value = opts.value, tol = opts.tol, ppm = opts.ppm, count = opts.count || 'auto';
    var notes = [];
    if (!(value >= 0) || !isFinite(value)) return { error: 'Value must be zero or greater.' };
    if (value === 0) return { bands: ['black'], count: 1, value: 0, tol: null, ppm: null, notes: ['A single black band marks a zero-ohm jumper.'] };

    if (ppm != null) count = 6;
    var two = decompose(value, 2);
    if (count === 'auto') {
      if (tol == null) tol = two ? 5 : 1;
      if (ppm != null) count = 6;
      else if (!two) count = 5;
      else if (tol === 20) count = 3;
      else if ([1, 2, 5, 10].indexOf(tol) >= 0) count = 4;
      else count = 5;
    } else {
      count = Number(count);
      if (tol == null) tol = count === 3 ? 20 : count === 4 ? 5 : 1;
    }

    var n = (count === 5 || count === 6) ? 3 : 2;
    var dm = decompose(value, n);
    if (!dm) return { error: formatOhms(value) + ' needs more significant digits than a ' + count + '-band resistor can show. Try 5 or 6 bands.' };
    if (dm.m < -2 || dm.m > 9) return { error: formatOhms(value) + ' is outside the range the color bands can express (about 0.1 Ω to 999 GΩ).' };

    var ds = String(dm.D), bands = [];
    for (var i = 0; i < ds.length; i++) bands.push(colorFor(DIGIT, Number(ds[i])));
    bands.push(colorFor(MULT, dm.m));
    if (count !== 3) {
      var tc = colorFor(TOL, tol);
      if (!tc) return { error: '±' + tol + '% is not a standard tolerance. Use 0.05, 0.1, 0.25, 0.5, 1, 2, 5, or 10.' };
      bands.push(tc);
    } else if (tol !== 20) {
      return { error: '3-band resistors are always ±20%.' };
    }
    if (count === 6) {
      var pc = colorFor(PPM, ppm == null ? 100 : ppm);
      if (!pc) return { error: ppm + ' ppm/°C is not a standard temperature coefficient. Use 1, 5, 10, 15, 20, 25, 50, 100, or 250.' };
      bands.push(pc);
      if (ppm == null) notes.push('No temperature coefficient given, so 100 ppm/°C (brown) was used.');
    }
    if (count === 4 && tol < 1) notes.push('Tolerances this tight normally use 5 bands.');
    return { bands: bands, count: count, value: value, tol: count === 3 ? 20 : tol, ppm: count === 6 ? (ppm == null ? 100 : ppm) : null, notes: notes };
  }

  var api = { HEX: HEX, ROLES: ROLES, DIGIT: DIGIT, MULT: MULT, TOL: TOL, PPM: PPM, decode: decode, encode: encode, parseInput: parseInput, formatOhms: formatOhms };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ResistorLogic = api;
})(this);
