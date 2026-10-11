/* Copyright 2026 TheMakersWorkbench.com. Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE. */
/* Pure calculation logic for the Embedded Systems Toolkit. No DOM access, so it can be tested in Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TMWBEmb = factory();
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


  /* ---------- ADC ---------- */
  /** mode 'c2v' counts to volts, 'v2c' volts to counts. convention 'pow' divides by 2^n, 'max' by 2^n - 1. */
  function adc(o) {
    var bits = Math.round(o.bits), levels = Math.pow(2, bits);
    if (!(bits >= 1 && o.vref > 0)) return { error: 'Enter the ADC bits and the reference voltage.' };
    var denom = o.convention === 'max' ? levels - 1 : levels, lsb = o.vref / denom, r = { levels: levels, lsb: lsb, denom: denom };
    if (!isFinite(o.value) || o.value < 0) return { error: 'Enter a value of zero or more.' };
    if (o.mode === 'c2v') {
      if (o.value > levels - 1) return { error: 'An ' + bits + '-bit ADC only gives counts from 0 to ' + (levels - 1) + '.' };
      r.out = o.value * lsb;
    } else {
      r.out = o.convention === 'max' ? Math.round(o.value / lsb) : Math.floor(o.value / lsb);
      if (r.out > levels - 1) { r.out = levels - 1; r.clipped = true; }
    }
    return r;
  }

  /* ---------- ADC divider ---------- */
  /** Find R1 (top) / R2 (bottom) so Vmax maps just under Vref (with headroom), and return the facts needed to scale readings. */
  function adcDivider(o) {
    if (!(o.Vmax > 0 && o.Vref > 0)) return { error: 'Enter the highest voltage to measure and the ADC reference voltage.' };
    if (o.Vmax <= o.Vref) return { error: 'Your highest voltage is already within the ADC range, so no divider is needed.' };
    var head = o.head >= 0 ? o.head : 5, target = o.Vref * (1 - head / 100) / o.Vmax;
    var lo = o.Rmin > 0 ? o.Rmin : 10000, hi = o.Rmax > 0 ? o.Rmax : 200000;
    if (hi <= lo) return { error: 'The maximum total resistance must be larger than the minimum.' };
    var vals = seriesValues(o.series, lo / 50, hi), found = [], i, j;
    for (i = 0; i < vals.length; i++) for (j = 0; j < vals.length; j++) {
      var tot = vals[i] + vals[j];
      if (tot < lo * (1 - 1e-9) || tot > hi * (1 + 1e-9)) continue;
      var f = vals[j] / tot;
      if (o.Vmax * f > o.Vref * (1 + 1e-9)) continue;
      found.push({ R1: vals[i], R2: vals[j], f: f, d: Math.abs(f - target) });
    }
    if (!found.length) return { error: 'No pair fits in that resistance range. Widen the range or the headroom.' };
    var gm = Math.sqrt(lo * hi);
    found.sort(function (a, b) { var d = a.d - b.d; if (Math.abs(d) > 1e-9) return d; return Math.abs(Math.log((a.R1 + a.R2) / gm)) - Math.abs(Math.log((b.R1 + b.R2) / gm)); });
    var bits = Math.round(o.bits) || 12, out = [], seen = [];
    for (i = 0; i < found.length && out.length < 4; i++) {
      var dup = seen.some(function (e) { return Math.abs(e - found[i].f) < 1e-9; });
      if (dup) continue;
      seen.push(found[i].f);
      var R1 = found[i].R1, R2 = found[i].R2, I = o.Vmax / (R1 + R2), ratio = (R1 + R2) / R2, vadc = o.Vmax * found[i].f;
      out.push({ R1: R1, R2: R2, ratio: ratio, VadcMax: vadc, I: I, P1: I * I * R1, P2: I * I * R2, Zsrc: R1 * R2 / (R1 + R2),
        stepAtInput: o.Vref / Math.pow(2, bits) * ratio, countsMax: Math.floor(vadc / o.Vref * Math.pow(2, bits)) });
    }
    return { list: out, best: out[0], bits: bits };
  }

  /** Copy-paste code that undoes the divider. lang: 'arduino', 'esp32', 'micropython'. */
  function adcCode(o) {
    var R1 = String(o.R1), R2 = String(o.R2), vref = String(o.Vref), bits = Math.round(o.bits) || 10, max = Math.pow(2, bits) - 1;
    if (o.lang === 'esp32') return [
      '// ESP32 (Arduino core): read a voltage through a divider',
      'const int   ADC_PIN = 34;       // use an ADC1 pin (GPIO32-39)',
      'const float R1 = ' + R1 + ';        // top resistor, ohms',
      'const float R2 = ' + R2 + ';        // bottom resistor, ohms',
      '',
      'void setup() {',
      '  Serial.begin(115200);',
      '  analogReadResolution(12);',
      '  analogSetPinAttenuation(ADC_PIN, ADC_11db);',
      '}',
      '',
      'void loop() {',
      '  float mv  = analogReadMilliVolts(ADC_PIN);          // calibrated millivolts at the pin',
      '  float vin = (mv / 1000.0) * (R1 + R2) / R2;        // undo the divider',
      '  Serial.println(vin, 3);',
      '  delay(500);',
      '}'].join('\n');
    if (o.lang === 'micropython') return [
      '# MicroPython: read a voltage through a divider',
      'from machine import ADC, Pin',
      'import time',
      '',
      'adc = ADC(Pin(26))      # Pico GP26. On ESP32 use ADC(Pin(34)) and adc.atten(ADC.ATTN_11DB)',
      'VREF = ' + vref + '          # ADC reference voltage',
      'R1 = ' + R1 + '          # top resistor, ohms',
      'R2 = ' + R2 + '          # bottom resistor, ohms',
      '',
      'def read_voltage():',
      '    raw = adc.read_u16()                         # 0 to 65535 on every port',
      '    return raw / 65535 * VREF * (R1 + R2) / R2   # undo the divider',
      '',
      'while True:',
      '    print(round(read_voltage(), 3))',
      '    time.sleep(0.5)'].join('\n');
    return [
      '// Arduino: read a voltage through a divider',
      'const int   ADC_PIN = A0;',
      'const float VREF    = ' + vref + ';        // ADC reference voltage',
      'const float ADC_MAX = ' + max + '.0;      // 2^' + bits + ' - 1',
      'const float R1 = ' + R1 + ';         // top resistor, ohms',
      'const float R2 = ' + R2 + ';         // bottom resistor, ohms',
      '',
      'void setup() {',
      '  Serial.begin(115200);',
      '}',
      '',
      'void loop() {',
      '  int   raw  = analogRead(ADC_PIN);',
      '  float vadc = raw * VREF / ADC_MAX;                // voltage at the pin',
      '  float vin  = vadc * (R1 + R2) / R2;               // undo the divider',
      '  Serial.println(vin, 3);',
      '  delay(500);',
      '}'].join('\n');
  }

  /* ---------- PWM ---------- */
  function pwm(o) {
    if (!(o.f > 0 && o.duty >= 0 && o.duty <= 100)) return { error: 'Enter a frequency above zero and a duty cycle from 0 to 100 %.' };
    var T = 1 / o.f, r = { T: T, ton: T * o.duty / 100, toff: T * (1 - o.duty / 100), fcFilter: o.f / 10 };
    if (o.Vs >= 0 && isFinite(o.Vs)) r.avg = o.Vs * o.duty / 100;
    return r;
  }

  /* ---------- logic levels ---------- */
  var LOGIC = {
    avr5: { name: 'ATmega328P, 5 V (Uno)', supply: 5, VOH: 4.0, VOL: 0.9, VIH: 3.0, VIL: 1.5, abs: 5.5 },
    esp32: { name: 'ESP32, 3.3 V', supply: 3.3, VOH: 2.64, VOL: 0.33, VIH: 2.475, VIL: 0.825, abs: 3.6 },
    ttl: { name: '5 V TTL (74LS)', supply: 5, VOH: 2.7, VOL: 0.4, VIH: 2.0, VIL: 0.8, abs: 5.5 },
    hct5: { name: '74HCT, 5 V', supply: 5, VOH: 4.4, VOL: 0.1, VIH: 2.0, VIL: 0.8, abs: 5.5 },
    hc5: { name: '74HC/CD4000, 5 V', supply: 5, VOH: 4.4, VOL: 0.1, VIH: 3.5, VIL: 1.5, abs: 5.5 },
    lvttl: { name: '3.3 V LVTTL', supply: 3.3, VOH: 2.4, VOL: 0.4, VIH: 2.0, VIL: 0.8, abs: 3.6 }
  };

  function logicLevels(a, b) {
    function pick(x, p) { return x.id === 'custom' ? x : Object.assign({ id: x.id }, LOGIC[x.id]); }
    var A = pick(a), B = pick(b), vals = [A.VOH, A.VOL, A.supply, B.VIH, B.VIL, B.abs];
    if (vals.some(function (v) { return !isFinite(v); })) return { error: 'Fill in all the custom values.' };
    var hi = A.VOH - B.VIH, lo = B.VIL - A.VOL, danger = A.supply > B.abs + 1e-9, r = { A: A, B: B, highMargin: hi, lowMargin: lo, danger: danger };
    if (danger) { r.verdict = 'danger'; r.advice = ['The driver can output ' + A.supply + ' V, but the receiver tolerates only ' + B.abs + ' V. Connecting them directly can damage the receiver.',
      'Slow one-way signals: a resistor divider (for example 1 k\u03a9 over 2 k\u03a9). Fast or two-way signals (I\u00b2C): a MOSFET level shifter or a level-translator chip such as a 74LVC245 or TXS0108E.']; }
    else if (hi < 0 || lo < 0) { r.verdict = 'shifter'; r.advice = [(hi < 0 ? 'The driver\u2019s high level is below what the receiver needs to see a 1. ' : '') + (lo < 0 ? 'The driver\u2019s low level is above what the receiver needs to see a 0. ' : ''),
      'Use a level shifter, or a buffer powered from the receiver\u2019s supply with inputs that accept the driver\u2019s level (a 74HCT buffer for 3.3 V into 5 V logic, for example).']; }
    else if (Math.min(hi, lo) < 0.2) { r.verdict = 'marginal'; r.advice = ['It should work but with little noise margin. Keep wires short, and consider a buffer or level shifter for anything that must be reliable.']; }
    else { r.verdict = 'ok'; r.advice = ['The levels are compatible. No level shifting needed.']; }
    return r;
  }

  /* ---------- UART ---------- */
  function uart(o) {
    if (!(o.fclk > 0 && o.baud > 0)) return { error: 'Enter the clock frequency and the baud rate you want.' };
    var m = o.mode === 'x8' ? 8 : 16, ubrr = Math.round(o.fclk / (m * o.baud)) - 1;
    if (ubrr < 0) return { error: 'That baud rate is too fast for this clock.' };
    var actual = o.fclk / (m * (ubrr + 1));
    return { ubrr: ubrr, actual: actual, errPct: (actual - o.baud) / o.baud * 100, tooBig: ubrr > 4095 };
  }

  /* ---------- AVR timer / prescaler ---------- */
  var AVR_TIMERS = { t0: { name: 'Timer0 (8-bit)', pre: [1, 8, 64, 256, 1024], max: 255 }, t1: { name: 'Timer1 (16-bit)', pre: [1, 8, 64, 256, 1024], max: 65535 },
    t2: { name: 'Timer2 (8-bit)', pre: [1, 8, 32, 64, 128, 256, 1024], max: 255 } };
  function timerAvr(o) {
    var t = AVR_TIMERS[o.timer];
    if (!(o.fclk > 0 && o.f > 0 && t)) return { error: 'Enter the clock frequency and the frequency you want.' };
    var list = [];
    t.pre.forEach(function (p) {
      var ocr = Math.round(o.fclk / (p * o.f)) - 1;
      if (ocr < 0 || ocr > t.max) return;
      var actual = o.fclk / (p * (ocr + 1));
      list.push({ prescaler: p, ocr: ocr, actual: actual, errPct: (actual - o.f) / o.f * 100 });
    });
    if (!list.length) return { error: 'No prescaler reaches that frequency on ' + t.name + '. Try a slower frequency or the 16-bit timer.' };
    list.sort(function (a, b) { var d = Math.abs(a.errPct) - Math.abs(b.errPct); if (Math.abs(d) > 1e-9) return d; return b.ocr - a.ocr; });
    return { list: list, timer: t };
  }

  return { SERIES: SERIES, seriesValues: seriesValues, nearest: nearest, fmt: fmt, parse: parse, recommendWatts: recommendWatts, adc: adc, adcDivider: adcDivider, adcCode: adcCode,
    pwm: pwm, LOGIC: LOGIC, logicLevels: logicLevels, uart: uart, AVR_TIMERS: AVR_TIMERS, timerAvr: timerAvr };
});
