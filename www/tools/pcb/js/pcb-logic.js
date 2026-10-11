/* Copyright 2026 TheMakersWorkbench.com. Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE. */
/* Pure calculation logic for the PCB and Wiring Tools. No DOM access, so it can be tested in Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TMWBPcb = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- preferred-number series (IEC 60063) ---------- */
  var E6 = [1.0, 1.5, 2.2, 3.3, 4.7, 6.8];
  var E12 = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
  var E24 = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];
  var E96 = [1.00, 1.02, 1.05, 1.07, 1.10, 1.13, 1.15, 1.18, 1.21, 1.24, 1.27, 1.30, 1.33, 1.37, 1.40, 1.43, 1.47, 1.50, 1.54, 1.58,
    1.62, 1.65, 1.69, 1.74, 1.78, 1.82, 1.87, 1.91, 1.96, 2.00, 2.05, 2.10, 2.15, 2.21, 2.26, 2.32, 2.37, 2.43, 2.49, 2.55, 2.61, 2.67,
    2.74, 2.80, 2.87, 2.94, 3.01, 3.09, 3.16, 3.24, 3.32, 3.40, 3.48, 3.57, 3.65, 3.74, 3.83, 3.92, 4.02, 4.12, 4.22, 4.32, 4.42, 4.53,
    4.64, 4.75, 4.87, 4.99, 5.11, 5.23, 5.36, 5.49, 5.62, 5.76, 5.90, 6.04, 6.19, 6.34, 6.49, 6.65, 6.81, 6.98, 7.15, 7.32, 7.50, 7.68,
    7.87, 8.06, 8.25, 8.45, 8.66, 8.87, 9.09, 9.31, 9.53, 9.76];
  var E48 = E96.filter(function (v, i) { return i % 2 === 0; });
  var SERIES = { E6: E6, E12: E12, E24: E24, E48: E48, E96: E96 };

  function clean(x) { return Number(x.toPrecision(12)); }

  /** All values of a series between lo and hi (inclusive), across decades, ascending. */
  function seriesValues(name, lo, hi) {
    var base = SERIES[name], out = [];
    for (var d = Math.floor(Math.log10(lo)) - 1; d <= Math.ceil(Math.log10(hi)) + 1; d++) {
      for (var i = 0; i < base.length; i++) {
        var v = clean(base[i] * Math.pow(10, d));
        if (v >= lo * (1 - 1e-9) && v <= hi * (1 + 1e-9)) out.push(v);
      }
    }
    return out;
  }

  /** Nearest series value to v. dir: 'up' (>= v), 'down' (<= v) or 'nearest'. */
  function nearest(name, v, dir) {
    var c = seriesValues(name, v / 12, v * 12), best = null, i;
    if (dir === 'up') { for (i = 0; i < c.length; i++) if (c[i] >= v * (1 - 1e-9)) return c[i]; return null; }
    if (dir === 'down') { for (i = c.length - 1; i >= 0; i--) if (c[i] <= v * (1 + 1e-9)) return c[i]; return null; }
    for (i = 0; i < c.length; i++) if (best === null || Math.abs(Math.log(c[i] / v)) < Math.abs(Math.log(best / v))) best = c[i];
    return best;
  }

  /* ---------- number formatting and parsing ---------- */
  var PREFIXES = [['G', 1e9], ['M', 1e6], ['k', 1e3], ['', 1], ['m', 1e-3], ['µ', 1e-6], ['n', 1e-9], ['p', 1e-12]];

  /** Engineering notation: fmt(0.0047, 'A') -> "4.7 mA". */
  function fmt(v, unit, sig) {
    sig = sig || 3; unit = unit || '';
    if (v === null || v === undefined || !isFinite(v)) return '–';
    if (v === 0) return '0 ' + unit;
    var a = Math.abs(v), i;
    for (i = 0; i < PREFIXES.length; i++) if (a >= PREFIXES[i][1] * 0.9995) break;
    if (i === PREFIXES.length) i = PREFIXES.length - 1;
    var s = Number((v / PREFIXES[i][1]).toPrecision(sig));
    if (Math.abs(s) >= 1000 && i > 0) { i--; s = Number((v / PREFIXES[i][1]).toPrecision(sig)); }
    return String(s) + ' ' + PREFIXES[i][0] + unit;
  }

  var MULT = { p: 1e-12, n: 1e-9, u: 1e-6, m: 1e-3, k: 1e3, K: 1e3, M: 1e6, G: 1e9 };

  /** Parse "4.7k", "4k7", "10u", "2.2 uF", "330", "1e-3" -> number. Returns NaN for blank or invalid. */
  function parse(s) {
    if (typeof s === 'number') return s;
    s = String(s == null ? '' : s).replace(/\s+/g, '').replace(/[µμ]/g, 'u').replace(/ohms?|Ω|Ω/gi, '').replace(/meg/i, 'M');
    if (s === '') return NaN;
    var m = /^(\d+)([pnumkKMG])(\d+)$/.exec(s);
    if (m) return clean(parseFloat(m[1] + '.' + m[3]) * MULT[m[2]]);
    m = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)([pnumkKMG])?([a-zA-Z%]*)$/.exec(s);
    if (!m) return NaN;
    return clean(parseFloat(m[1]) * (m[2] ? MULT[m[2]] : 1));
  }

  /* ---------- resistor power ratings ---------- */
  var WATTS = [0.125, 0.25, 0.5, 1, 2, 3, 5, 10, 25, 50, 100];
  function wattLabel(w) {
    if (w === 0.125) return '1/8 W'; if (w === 0.25) return '1/4 W'; if (w === 0.5) return '1/2 W';
    return w + ' W';
  }
  /** Smallest standard rating that is at least `factor` times the dissipation (default 2x, i.e. 50% derating). */
  function recommendWatts(p, factor) {
    factor = factor || 2;
    for (var i = 0; i < WATTS.length; i++) if (WATTS[i] >= p * factor * (1 - 1e-9)) return { watts: WATTS[i], label: wattLabel(WATTS[i]), margin: WATTS[i] / p };
    return { watts: null, label: 'more than 100 W (use a power resistor)', margin: null };
  }

  /** AWG diameter in mm (ASTM B258): 0.127 mm * 92^((36-n)/39). */
  function awgDiameterMm(n) { return 0.127 * Math.pow(92, (36 - n) / 39); }
  var RHO_CU = 1.724e-8; // ohm-metres, annealed copper at 20 C
  function wire(o) {
    if (!(o.awg >= 0 && o.awg <= 40 && o.len > 0 && o.I > 0)) return { error: 'Enter an AWG size (0 to 40), a length, and a current.' };
    var d = awgDiameterMm(o.awg), areaMm2 = Math.PI / 4 * d * d, perM = RHO_CU / (areaMm2 * 1e-6);
    var lenM = o.unit === 'ft' ? o.len * 0.3048 : o.len, path = o.round ? lenM * 2 : lenM;
    var R = perM * path, drop = R * o.I, r = { d: d, area: areaMm2, perM: perM, perFt: perM * 0.3048, path: path, R: R, drop: drop, loss: drop * o.I };
    if (o.Vs > 0) r.dropPct = drop / o.Vs * 100;
    return r;
  }


  var MIL_MM = 0.0254, OZ_MIL = 1.378, OZ_M = 35e-6, ALPHA_CU = 0.00393;

  /* ---------- trace width (IPC-2221) ---------- */
  /** I = k * dT^0.44 * A^0.725, A in square mils. k = 0.048 external, 0.024 internal. */
  function traceWidth(o) {
    if (!(o.I > 0 && o.dT > 0 && o.oz > 0)) return { error: 'Enter the current, the allowed temperature rise, and the copper weight.' };
    var k = o.layer === 'int' ? 0.024 : 0.048, A = Math.pow(o.I / (k * Math.pow(o.dT, 0.44)), 1 / 0.725), wMil = A / (o.oz * OZ_MIL);
    return { k: k, areaMil2: A, wMil: wMil, wMm: wMil * MIL_MM, thickMil: o.oz * OZ_MIL, thickUm: o.oz * 35, outOfRange: o.I > 35 };
  }

  /* ---------- trace resistance ---------- */
  function traceResistance(o) {
    if (!(o.len > 0 && o.w > 0 && o.oz > 0)) return { error: 'Enter the length, width, and copper weight.' };
    var T = isFinite(o.T) ? o.T : 20, R20 = RHO_CU * (o.len / 1000) / ((o.w / 1000) * o.oz * OZ_M), R = R20 * (1 + ALPHA_CU * (T - 20)), r = { R20: R20, R: R, T: T };
    if (o.I > 0) { r.drop = o.I * R; r.P = o.I * o.I * R; }
    return r;
  }

  /* ---------- via current (estimate) ---------- */
  function via(o) {
    if (!(o.drill > 0 && o.plate > 0 && o.dT > 0) || o.plate * 2 >= o.drill * 1000) return { error: 'Enter the drill diameter, the plating thickness (smaller than half the drill), and the allowed temperature rise.' };
    var D = o.drill / MIL_MM, t = o.plate / 25.4, area = Math.PI / 4 * (D * D - (D - 2 * t) * (D - 2 * t));
    var I = 0.024 * Math.pow(o.dT, 0.44) * Math.pow(area, 0.725), r = { areaMil2: area, I: I };
    if (o.len > 0) { var aM2 = area * Math.pow(MIL_MM / 1000, 2); r.R = RHO_CU * (o.len / 1000) / aM2; r.len = o.len; }
    return r;
  }

  /* ---------- conductor spacing for voltage (IPC-2221 Table 6-1) ---------- */
  var SPACING_V = [15, 30, 50, 100, 150, 170, 250, 300, 500];
  var SPACING = {
    int: { name: 'Internal layer', mm: [0.05, 0.05, 0.1, 0.1, 0.2, 0.2, 0.2, 0.2, 0.25] },
    ext: { name: 'External, uncoated (up to 3050 m altitude)', mm: [0.1, 0.1, 0.6, 0.6, 0.6, 1.25, 1.25, 1.25, 2.5] },
    coated: { name: 'External, with permanent polymer coating', mm: [0.13, 0.13, 0.13, 0.13, 0.4, 0.4, 0.4, 0.4, 0.8] }
  };
  function spacing(o) {
    var t = SPACING[o.kind];
    if (!t || !(o.V > 0)) return { error: 'Enter the voltage between the two conductors.' };
    if (o.V > 500) return { error: 'Above 500 V this table does not apply. Use the full IPC-2221 formula or the IEC 60664 creepage and clearance tables for your case.' };
    for (var i = 0; i < SPACING_V.length; i++) if (o.V <= SPACING_V[i]) return { mm: t.mm[i], mil: t.mm[i] / MIL_MM, upTo: SPACING_V[i], name: t.name };
  }

  /* ---------- AWG and metric ---------- */
  function awgToMetric(n) {
    if (!(n >= 0 && n <= 40)) return { error: 'Enter an AWG size from 0 to 40.' };
    var d = awgDiameterMm(n), a = Math.PI / 4 * d * d;
    return { d: d, area: a, perM: RHO_CU / (a * 1e-6) };
  }
  function metricToAwg(areaMm2) {
    if (!(areaMm2 > 0)) return { error: 'Enter a cross-section area above zero.' };
    var d = Math.sqrt(4 * areaMm2 / Math.PI), n = 36 - 39 * Math.log(d / 0.127) / Math.log(92);
    return { d: d, awg: n, nearest: Math.round(n) };
  }

  return { SERIES: SERIES, nearest: nearest, fmt: fmt, parse: parse, recommendWatts: recommendWatts, RHO_CU: RHO_CU, awgDiameterMm: awgDiameterMm, wire: wire,
    traceWidth: traceWidth, traceResistance: traceResistance, via: via, SPACING: SPACING, spacing: spacing, awgToMetric: awgToMetric, metricToAwg: metricToAwg };
});
