/* Copyright 2026 TheMakersWorkbench.com. Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE. */
/* Pure calculation logic for the Circuit Calculators. No DOM access, so it can be tested in Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TMWBCalc = factory();
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

  /* ---------- Ohm's law + power ---------- */
  /** Give any two of V, I, R, P (others NaN). Returns {V,I,R,P,...} or {error}. */
  function ohm(inp) {
    var keys = ['V', 'I', 'R', 'P'], known = keys.filter(function (k) { return isFinite(inp[k]); });
    if (known.length < 2) return { error: 'Enter any two values.' };
    if (known.length > 2) return { error: 'Enter only two values; the other two are calculated.' };
    for (var i = 0; i < known.length; i++) if (!(inp[known[i]] > 0)) return { error: 'Values must be greater than zero.' };
    var V = inp.V, I = inp.I, R = inp.R, P = inp.P, k = known.join('');
    if (k === 'VI') { R = V / I; P = V * I; }
    else if (k === 'VR') { I = V / R; P = V * V / R; }
    else if (k === 'VP') { I = P / V; R = V * V / P; }
    else if (k === 'IR') { V = I * R; P = I * I * R; }
    else if (k === 'IP') { V = P / I; R = P / (I * I); }
    else if (k === 'RP') { V = Math.sqrt(P * R); I = Math.sqrt(P / R); }
    var rec = recommendWatts(P, 2);
    return { V: V, I: I, R: R, P: P, rec: rec, minLabel: recommendWatts(P, 1).label };
  }

  /* ---------- LED resistor ---------- */
  /** n LEDs, series (one resistor, LEDs in a chain) or parallel (one resistor per LED). */
  function led(o) {
    var n = Math.round(o.n);
    if (!(o.Vs > 0 && o.Vf > 0 && o.If > 0 && n >= 1)) return { error: 'Enter the supply voltage, LED forward voltage, current, and a count of 1 or more.' };
    var drop = o.mode === 'series' ? n * o.Vf : o.Vf, avail = o.Vs - drop;
    if (avail <= 0) return { error: o.mode === 'series'
      ? 'The supply (' + fmt(o.Vs, 'V') + ') must be higher than ' + n + ' × ' + fmt(o.Vf, 'V') + ' = ' + fmt(drop, 'V') + '. Use fewer LEDs in series, or wire them in parallel.'
      : 'The supply must be higher than the LED forward voltage.' };
    var R = avail / o.If, Rstd = nearest(o.series, R, 'up'), Iact = avail / Rstd, P = Iact * Iact * Rstd;
    return { n: n, mode: o.mode, avail: avail, drop: drop, R: R, Rstd: Rstd, Iact: Iact, P: P, rec: recommendWatts(P, 2),
      resistors: o.mode === 'series' ? 1 : n, totalI: o.mode === 'series' ? Iact : Iact * n };
  }

  /* ---------- voltage divider ---------- */
  function dividerStats(Vin, R1, R2, Rload) {
    var I = Vin / (R1 + R2), vout = Vin * R2 / (R1 + R2), r = { R1: R1, R2: R2, Vout: vout, I: I, P1: I * I * R1, P2: I * I * R2, Zout: R1 * R2 / (R1 + R2) };
    if (Rload > 0) { var r2l = R2 * Rload / (R2 + Rload); r.VoutLoaded = Vin * r2l / (R1 + r2l); r.Iload = r.VoutLoaded / Rload; }
    return r;
  }

  /** Find R1/R2 pairs from a series that give the target Vout. R1 is top (to Vin), R2 is bottom (to ground). */
  function divider(o) {
    if (!(o.Vin > 0 && o.Vout > 0)) return { error: 'Enter the input voltage and the output voltage you want.' };
    if (o.Vout >= o.Vin) return { error: 'The output voltage must be lower than the input voltage. A divider can only reduce voltage.' };
    var lo = o.Rmin > 0 ? o.Rmin : 1000, hi = o.Rmax > 0 ? o.Rmax : 100000;
    if (hi <= lo) return { error: 'The maximum total resistance must be larger than the minimum.' };
    var vals = seriesValues(o.series, lo / 100, hi), ratio = o.Vout / o.Vin, found = [], gm = Math.sqrt(lo * hi), i, j;
    for (i = 0; i < vals.length; i++) for (j = 0; j < vals.length; j++) {
      var tot = vals[i] + vals[j];
      if (tot < lo * (1 - 1e-9) || tot > hi * (1 + 1e-9)) continue;
      var f = vals[j] / tot;
      found.push({ R1: vals[i], R2: vals[j], err: (f - ratio) / ratio, tot: tot });
    }
    found.sort(function (a, b) {
      var d = Math.abs(a.err) - Math.abs(b.err);
      if (Math.abs(d) > 1e-9) return d;
      return Math.abs(Math.log(a.tot / gm)) - Math.abs(Math.log(b.tot / gm));
    });
    var out = [], seen = [];
    for (i = 0; i < found.length && out.length < 6; i++) {
      var dup = seen.some(function (e) { return Math.abs(e - found[i].err) < 1e-9; });
      if (dup) continue;
      seen.push(found[i].err);
      var s = dividerStats(o.Vin, found[i].R1, found[i].R2, o.Rload);
      s.errPct = found[i].err * 100;
      out.push(s);
    }
    if (!out.length) return { error: 'No combinations fit in that resistance range. Widen the range.' };
    return { list: out, best: out[0] };
  }

  /* ---------- series / parallel (resistors and capacitors) ---------- */
  function sumList(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
  function recipList(a) { return 1 / a.reduce(function (x, y) { return x + 1 / y; }, 0); }

  /** Find 1 or 2 series values that make `target`. add = parts that simply add (R in series, C in parallel); recip = reciprocal rule. */
  function findCombo(o) {
    var t = o.target, found = [], i, j;
    if (!(t > 0)) return { error: 'Enter a target value greater than zero.' };
    function push(val, desc, n) { found.push({ value: val, errPct: (val - t) / t * 100, desc: desc, parts: n }); }
    var d = nearest(o.series, t, 'down'), u = nearest(o.series, t, 'up');
    if (d !== null) push(d, [d], 1);
    if (u !== null && u !== d) push(u, [u], 1);
    var addVals = seriesValues(o.series, t / 40, t), recVals = seriesValues(o.series, t, t * 40);
    for (i = 0; i < addVals.length; i++) for (j = i; j < addVals.length; j++) {
      var s = addVals[i] + addVals[j];
      if (Math.abs(s - t) / t < 0.05) found.push({ value: s, errPct: (s - t) / t * 100, desc: [addVals[i], addVals[j]], parts: 2, kind: 'add' });
    }
    for (i = 0; i < recVals.length; i++) for (j = i; j < recVals.length; j++) {
      var p = recVals[i] * recVals[j] / (recVals[i] + recVals[j]);
      if (Math.abs(p - t) / t < 0.05) found.push({ value: p, errPct: (p - t) / t * 100, desc: [recVals[i], recVals[j]], parts: 2, kind: 'recip' });
    }
    found.sort(function (a, b) {
      var d2 = Math.abs(a.errPct) - Math.abs(b.errPct);
      if (Math.abs(d2) > 1e-9) return d2;
      return a.parts - b.parts;
    });
    var out = [], seen = {};
    for (i = 0; i < found.length && out.length < 6; i++) {
      var key = found[i].desc.join('|') + found[i].kind;
      if (seen[key]) continue;
      seen[key] = 1;
      out.push(found[i]);
    }
    return { list: out };
  }

  /* ---------- extra calculators ---------- */
  function rc(o) {
    if (!(o.R > 0 && o.C > 0)) return { error: 'Enter a resistance and a capacitance.' };
    var tau = o.R * o.C;
    return { tau: tau, fc: 1 / (2 * Math.PI * tau), rise: 2.2 * tau, settle: 5 * tau, t95: 3 * tau };
  }

  function reactance(o) {
    var r = {};
    if (o.L > 0 && o.C > 0) { r.f0 = 1 / (2 * Math.PI * Math.sqrt(o.L * o.C)); r.Z0 = Math.sqrt(o.L / o.C); }
    if (o.f > 0 && o.L > 0) r.XL = 2 * Math.PI * o.f * o.L;
    if (o.f > 0 && o.C > 0) r.XC = 1 / (2 * Math.PI * o.f * o.C);
    if (o.R > 0 && r.f0 !== undefined) {
      r.Qseries = Math.sqrt(o.L / o.C) / o.R; r.BWseries = r.f0 / r.Qseries;
      r.Qparallel = o.R * Math.sqrt(o.C / o.L); r.BWparallel = r.f0 / r.Qparallel;
    }
    if (!Object.keys(r).length) return { error: 'Enter an inductance and capacitance (for resonance), or a frequency with either one (for reactance).' };
    return r;
  }

  function timer555(o) {
    if (o.mode === 'mono') {
      if (!(o.R1 > 0 && o.C > 0)) return { error: 'Enter R and C.' };
      return { T: 1.1 * o.R1 * o.C };
    }
    if (!(o.R1 > 0 && o.R2 > 0 && o.C > 0)) return { error: 'Enter R1, R2, and C.' };
    var th = 0.693 * (o.R1 + o.R2) * o.C, tl = 0.693 * o.R2 * o.C, T = th + tl;
    return { th: th, tl: tl, T: T, f: 1 / T, duty: th / T * 100 };
  }

  var VREF317 = 1.25, IADJ317 = 50e-6;
  function lm317(o) {
    if (o.mode === 'solve') {
      if (!(o.R1 > 0 && o.Vout > VREF317)) return { error: 'Enter R1 and a target output voltage above 1.25 V.' };
      var R2 = (o.Vout - VREF317) / (VREF317 / o.R1 + IADJ317), Rstd = nearest('E96', R2, 'nearest');
      return { R2: R2, R2std: Rstd, Vout: VREF317 * (1 + Rstd / o.R1) + IADJ317 * Rstd, minVin: o.Vout + 3 };
    }
    if (!(o.R1 > 0 && o.R2 >= 0)) return { error: 'Enter R1 and R2.' };
    var v = VREF317 * (1 + o.R2 / o.R1) + IADJ317 * o.R2;
    return { Vout: v, minVin: v + 3 };
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

  var I2C_MODES = { std: { name: 'Standard (100 kHz)', tr: 1000e-9, cmax: 400e-12, iol: 3e-3 },
    fast: { name: 'Fast (400 kHz)', tr: 300e-9, cmax: 400e-12, iol: 3e-3 },
    fmp: { name: 'Fast-mode Plus (1 MHz)', tr: 120e-9, cmax: 550e-12, iol: 20e-3 } };
  function i2c(o) {
    var m = I2C_MODES[o.mode];
    if (!(o.Vdd > 0 && o.Cb > 0)) return { error: 'Enter the supply voltage and the total bus capacitance.' };
    var vol = o.Vdd > 2 ? 0.4 : 0.2 * o.Vdd, rmax = m.tr / (0.8473 * o.Cb), rmin = (o.Vdd - vol) / m.iol, r = { vol: vol, rmax: rmax, rmin: rmin, over: o.Cb > m.cmax, mode: m };
    if (rmax >= rmin) { var pick = nearest('E24', Math.sqrt(rmin * rmax), 'nearest'); if (pick > rmax) pick = nearest('E24', rmax, 'down'); if (pick < rmin) pick = nearest('E24', rmin, 'up'); r.pick = pick; }
    return r;
  }

  function battery(o) {
    if (!(o.cap > 0 && o.active >= 0 && o.usable > 0)) return { error: 'Enter the battery capacity and the load current.' };
    var duty = (isFinite(o.duty) ? o.duty : 100) / 100, sleep = isFinite(o.sleep) ? o.sleep : 0;
    if (duty < 0 || duty > 1) return { error: 'Duty cycle must be between 0 and 100 %.' };
    var avg = o.active * duty + sleep * (1 - duty);
    if (!(avg > 0)) return { error: 'The average current is zero.' };
    var hours = o.cap * (o.usable / 100) / avg;
    return { avg: avg, hours: hours, days: hours / 24 };
  }

  function bjtSwitch(o) {
    if (!(o.Ic > 0 && o.Vdrive > o.Vbe && o.Vbe > 0 && o.beta > 0)) return { error: 'Enter the load current, a drive voltage above Vbe, and a forced beta.' };
    var Ib = o.Ic / o.beta, Rb = (o.Vdrive - o.Vbe) / Ib, Rstd = nearest('E24', Rb, 'down') || Rb, IbAct = (o.Vdrive - o.Vbe) / Rstd;
    var r = { Ib: Ib, Rb: Rb, Rstd: Rstd, IbAct: IbAct, P: IbAct * IbAct * Rstd };
    if (o.hfe > 0) r.hfeOk = o.hfe >= o.beta;
    return r;
  }


  /* ---------- additions: RC reverse, LM317 current source, MOSFET, op-amp, zener, tolerance, shunt, NTC, dB ---------- */

  /** Give the cutoff and one of R or C; get the other, rounded to a standard value, with the actual cutoff. */
  function rcReverse(o) {
    if (!(o.fc > 0)) return { error: 'Enter the cutoff frequency you want.' };
    var haveR = o.R > 0, haveC = o.C > 0;
    if (haveR === haveC) return { error: 'Fill in exactly one of R or C. The other is calculated.' };
    var series = o.series || 'E12';
    if (haveR) {
      var C = 1 / (2 * Math.PI * o.R * o.fc), Cs = nearest(series, C, 'nearest');
      return { solve: 'C', exact: C, std: Cs, fcActual: 1 / (2 * Math.PI * o.R * Cs), errPct: (1 / (2 * Math.PI * o.R * Cs) - o.fc) / o.fc * 100 };
    }
    var R = 1 / (2 * Math.PI * o.C * o.fc), Rs = nearest(series, R, 'nearest');
    return { solve: 'R', exact: R, std: Rs, fcActual: 1 / (2 * Math.PI * Rs * o.C), errPct: (1 / (2 * Math.PI * Rs * o.C) - o.fc) / o.fc * 100 };
  }

  /** LM317 as a constant-current source: I = 1.25 V / R. */
  function lm317cc(o) {
    if (!(o.I > 0)) return { error: 'Enter the current you want.' };
    var R = VREF317 / o.I, Rs = nearest('E96', R, 'nearest'), I = VREF317 / Rs, P = I * I * Rs;
    return { R: R, Rstd: Rs, Iact: I, P: P, rec: recommendWatts(P, 2) };
  }

  /** MOSFET low-side switch: conduction loss, drop, gate drive. Rds(on) must be the datasheet value at your drive voltage. */
  function mosfet(o) {
    if (!(o.Id > 0 && o.Vdrive > 0 && o.Rds > 0)) return { error: 'Enter the load current, the gate drive voltage, and Rds(on).' };
    var r = { P: o.Id * o.Id * o.Rds, drop: o.Id * o.Rds };
    r.rec = recommendWatts(r.P, 2);
    if (o.Vth > 0) r.vthOk = o.Vdrive > o.Vth;
    if (o.Qg > 0 && o.f > 0) r.Igate = o.Qg * o.f;
    if (o.Ipk > 0) { r.Rg = o.Vdrive / o.Ipk; r.RgStd = nearest('E24', r.Rg, 'up'); r.IpkActual = o.Vdrive / r.RgStd; }
    return r;
  }

  /** Op-amp resistor gain stages. */
  function opamp(o) {
    var m = o.mode, r = {};
    if (!(o.Rf > 0)) return { error: 'Enter the feedback resistor Rf.' };
    if (m === 'inv' || m === 'non') {
      if (o.G > 0 && !(o.Rin > 0)) {
        if (m === 'non' && o.G <= 1) return { error: 'A non-inverting stage has a gain of at least 1.' };
        var exact = m === 'inv' ? o.Rf / o.G : o.Rf / (o.G - 1);
        r.RinExact = exact; r.Rin = nearest(o.series || 'E24', exact, 'nearest');
      } else if (o.Rin > 0) r.Rin = o.Rin;
      else return { error: 'Enter either the input resistor or a target gain.' };
      r.gain = m === 'inv' ? -o.Rf / r.Rin : 1 + o.Rf / r.Rin;
      if (o.V1 === o.V1 && isFinite(o.V1)) r.Vout = r.gain * o.V1;
      if (m === 'inv') r.Zin = r.Rin;
      return r;
    }
    if (m === 'sum') {
      if (!(o.Rin > 0 && o.R2 > 0)) return { error: 'Enter both input resistors.' };
      r.g1 = -o.Rf / o.Rin; r.g2 = -o.Rf / o.R2;
      if (isFinite(o.V1) && isFinite(o.V2)) r.Vout = r.g1 * o.V1 + r.g2 * o.V2;
      return r;
    }
    if (m === 'diff') {
      if (!(o.Rin > 0)) return { error: 'Enter the input resistor R1 (R2 is set equal to R1, and R4 equal to Rf).' };
      r.gain = o.Rf / o.Rin;
      if (isFinite(o.V1) && isFinite(o.V2)) r.Vout = r.gain * (o.V2 - o.V1);
      return r;
    }
    return { error: 'Unknown mode.' };
  }

  /** Zener shunt regulator with a series resistor. */
  function zener(o) {
    if (!(o.Vin > o.Vz && o.Vz > 0 && o.Iload >= 0 && o.Iz > 0)) return { error: 'Enter an input voltage above the zener voltage, the zener voltage, the load current, and the bias current.' };
    var R = (o.Vin - o.Vz) / (o.Iz + o.Iload), Rs = nearest('E24', R, 'down') || R;
    var Itot = (o.Vin - o.Vz) / Rs, Iz = Itot - o.Iload, Pnoload = o.Vz * Itot;
    return { R: R, Rstd: Rs, Itot: Itot, Iz: Iz, Pr: Itot * Itot * Rs, Pz: o.Vz * Iz, PzNoLoad: Pnoload, recZ: recommendWatts(Pnoload, 1.5), recR: recommendWatts(Itot * Itot * Rs, 2) };
  }

  /** Worst-case divider output with resistor tolerance. */
  function tolerance(o) {
    if (!(o.Vin > 0 && o.R1 > 0 && o.R2 > 0 && o.tol >= 0)) return { error: 'Enter the input voltage, both resistors, and the tolerance.' };
    var t = o.tol / 100, nom = o.Vin * o.R2 / (o.R1 + o.R2);
    var hi = o.Vin * (o.R2 * (1 + t)) / (o.R1 * (1 - t) + o.R2 * (1 + t));
    var lo = o.Vin * (o.R2 * (1 - t)) / (o.R1 * (1 + t) + o.R2 * (1 - t));
    return { nom: nom, min: lo, max: hi, minPct: (lo - nom) / nom * 100, maxPct: (hi - nom) / nom * 100 };
  }

  /** Current-sense shunt: R = Vsense / I. */
  function shunt(o) {
    if (!(o.I > 0 && o.Vs > 0)) return { error: 'Enter the maximum current and the sense voltage you can tolerate.' };
    var R = o.Vs / o.I, Rs = nearest('E96', R, 'down') || R, Vs = o.I * Rs, P = o.I * o.I * Rs, r = { R: R, Rstd: Rs, Vsense: Vs, P: P, rec: recommendWatts(P, 2) };
    if (o.Vfs > 0) r.gain = o.Vfs / Vs;
    return r;
  }

  /** NTC thermistor, beta equation. mode 'R2T' or 'T2R'. Temperatures in degrees C. */
  function ntc(o) {
    if (!(o.R0 > 0 && o.B > 0 && isFinite(o.T0))) return { error: 'Enter the nominal resistance, its temperature, and the B value.' };
    var T0 = o.T0 + 273.15;
    if (o.mode === 'T2R') {
      if (!isFinite(o.T)) return { error: 'Enter a temperature.' };
      return { R: o.R0 * Math.exp(o.B * (1 / (o.T + 273.15) - 1 / T0)) };
    }
    if (!(o.R > 0)) return { error: 'Enter the measured resistance.' };
    var T = 1 / (1 / T0 + Math.log(o.R / o.R0) / o.B);
    return { T: T - 273.15, F: (T - 273.15) * 9 / 5 + 32 };
  }

  /** Decibel conversions. */
  function decibels(o) {
    var v = o.value;
    if (!isFinite(v)) return { error: 'Enter a value.' };
    switch (o.mode) {
      case 'v2db': if (!(v > 0)) return { error: 'The ratio must be greater than zero.' }; return { out: 20 * Math.log10(v), unit: 'dB' };
      case 'p2db': if (!(v > 0)) return { error: 'The ratio must be greater than zero.' }; return { out: 10 * Math.log10(v), unit: 'dB' };
      case 'db2v': return { out: Math.pow(10, v / 20), unit: '\u00d7 (voltage ratio)' };
      case 'db2p': return { out: Math.pow(10, v / 10), unit: '\u00d7 (power ratio)' };
      case 'dbm2w': return { out: 1e-3 * Math.pow(10, v / 10), unit: 'W' };
      case 'w2dbm': if (!(v > 0)) return { error: 'Power must be greater than zero.' }; return { out: 10 * Math.log10(v / 1e-3), unit: 'dBm' };
    }
    return { error: 'Unknown mode.' };
  }

  return { E6: E6, E12: E12, E24: E24, E48: E48, E96: E96, SERIES: SERIES, seriesValues: seriesValues, nearest: nearest, fmt: fmt, parse: parse,
    WATTS: WATTS, recommendWatts: recommendWatts, ohm: ohm, led: led, divider: divider, dividerStats: dividerStats, sumList: sumList, recipList: recipList,
    findCombo: findCombo, rc: rc, reactance: reactance, timer555: timer555, lm317: lm317, awgDiameterMm: awgDiameterMm, wire: wire, i2c: i2c, I2C_MODES: I2C_MODES,
    battery: battery, bjtSwitch: bjtSwitch, rcReverse: rcReverse, lm317cc: lm317cc, mosfet: mosfet, opamp: opamp, zener: zener, tolerance: tolerance, shunt: shunt, ntc: ntc, decibels: decibels };
});
