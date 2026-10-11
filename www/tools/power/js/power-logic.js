/* Copyright 2026 TheMakersWorkbench.com. Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE. */
/* Pure calculation logic for the Power and Battery Tools. No DOM access, so it can be tested in Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TMWBPwr = factory();
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


  /* ---------- linear regulator thermal ---------- */
  function linearReg(o) {
    if (!(o.Vin > o.Vout && o.Vout > 0 && o.I > 0 && o.thJA > 0)) return { error: 'Enter an input voltage above the output voltage, the load current, and the package thermal resistance.' };
    var Iq = o.Iq > 0 ? o.Iq : 0, Ta = isFinite(o.Ta) ? o.Ta : 25, Tjmax = o.TjMax > 0 ? o.TjMax : 125;
    var P = (o.Vin - o.Vout) * o.I + o.Vin * Iq, r = { P: P, eff: o.Vout * o.I / (o.Vin * (o.I + Iq)) * 100, Tj: Ta + P * o.thJA, Tjmax: Tjmax, PmaxNoSink: (Tjmax - Ta) / o.thJA };
    r.ok = r.Tj <= Tjmax;
    r.verdict = !r.ok ? 'sink' : (r.Tj > Tjmax - 25 ? 'marginal' : 'ok');
    if (!r.ok) {
      r.thTotal = (Tjmax - Ta) / P;
      var rest = (o.thJC > 0 ? o.thJC : 0) + (o.thCS > 0 ? o.thCS : 0);
      r.thSA = r.thTotal - rest;
      r.impossible = r.thSA <= 0;
    }
    return r;
  }

  /* ---------- capacitor discharge / bleeder ---------- */
  function capDischarge(o) {
    if (!(o.C > 0 && o.V0 > 0 && o.V > 0 && o.V0 > o.V)) return { error: 'Enter the capacitance, the starting voltage, and a lower safe voltage.' };
    var ln = Math.log(o.V0 / o.V), r = { energy: 0.5 * o.C * o.V0 * o.V0, ln: ln };
    if (o.mode === 'bleeder') {
      if (!(o.t > 0)) return { error: 'Enter the time you want the discharge to take.' };
      r.R = o.t / (o.C * ln); r.Rstd = nearest('E24', r.R, 'down'); r.t = o.t;
      r.tActual = r.Rstd * o.C * ln; r.P0 = o.V0 * o.V0 / r.Rstd; r.tau = r.Rstd * o.C;
      return r;
    }
    if (!(o.R > 0)) return { error: 'Enter the discharge resistor.' };
    r.t = o.R * o.C * ln; r.tau = o.R * o.C; r.P0 = o.V0 * o.V0 / o.R; r.t5 = 5 * r.tau;
    return r;
  }

  /* ---------- battery pack ---------- */
  var CHEM = {
    liion: { name: 'Li-ion / LiPo', nom: 3.7, max: 4.2, min: 3.0 },
    lifepo4: { name: 'LiFePO4', nom: 3.2, max: 3.65, min: 2.5 },
    nimh: { name: 'NiMH', nom: 1.2, max: 1.45, min: 1.0 },
    alkaline: { name: 'Alkaline (AA, AAA)', nom: 1.5, max: 1.6, min: 0.9 },
    lead: { name: 'Lead-acid (per 2 V cell)', nom: 2.0, max: 2.35, min: 1.75 }
  };
  function batteryPack(o) {
    var c = CHEM[o.chem], s = Math.round(o.s), p = Math.round(o.p);
    if (!c || !(o.cap > 0) || !(s >= 1) || !(p >= 1)) return { error: 'Enter the cell capacity and at least 1 cell in series and 1 in parallel.' };
    var r = { chem: c, s: s, p: p, nom: c.nom * s, max: c.max * s, min: c.min * s, capMah: o.cap * p, cells: s * p };
    r.energy = r.nom * r.capMah / 1000;
    if (o.crate > 0) r.maxI = o.crate * r.capMah / 1000;
    return r;
  }

  /* ---------- battery life with regulator ---------- */
  function batteryLifeAdv(o) {
    if (!(o.cap > 0 && o.usable > 0 && o.Ia >= 0 && o.ta > 0 && o.ts >= 0)) return { error: 'Enter the battery capacity, the active current, and how long it stays active.' };
    var Is = isFinite(o.Is) ? o.Is : 0, avgLoad = (o.Ia * o.ta + Is * o.ts) / (o.ta + o.ts), Iq = o.Iq > 0 ? o.Iq : 0, Ibat;
    if (o.reg === 'switch') {
      if (!(o.Vbat > 0 && o.Vout > 0 && o.eff > 0 && o.eff <= 100)) return { error: 'Enter the battery voltage, the output voltage, and the regulator efficiency (1 to 100 %).' };
      Ibat = avgLoad * o.Vout / (o.Vbat * o.eff / 100) + Iq;
    } else if (o.reg === 'linear') Ibat = avgLoad + Iq;
    else Ibat = avgLoad;
    if (!(Ibat > 0)) return { error: 'The average current is zero.' };
    var hours = o.cap * o.usable / 100 / Ibat;
    return { avgLoad: avgLoad, Ibat: Ibat, hours: hours, days: hours / 24, duty: o.ta / (o.ta + o.ts) * 100 };
  }

  /* ---------- rectifier filter capacitor ---------- */
  function ripple(o) {
    if (!(o.I > 0 && o.f > 0)) return { error: 'Enter the load current and the ripple frequency.' };
    if (o.C > 0) return { dV: o.I / (o.f * o.C), C: o.C };
    if (o.dV > 0) { var C = o.I / (o.f * o.dV); return { C: C, Cstd: nearest('E12', C, 'up'), dV: o.dV, dVStd: o.I / (o.f * nearest('E12', C, 'up')) }; }
    return { error: 'Enter either the ripple voltage you allow, or a capacitance to check.' };
  }

  return { SERIES: SERIES, seriesValues: seriesValues, nearest: nearest, fmt: fmt, parse: parse, recommendWatts: recommendWatts,
    linearReg: linearReg, capDischarge: capDischarge, CHEM: CHEM, batteryPack: batteryPack, batteryLifeAdv: batteryLifeAdv, ripple: ripple };
});
