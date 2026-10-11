/* Copyright 2026 TheMakersWorkbench.com. Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE. */
/* Pure logic and data for the Bench Tools. No DOM access, so it can be tested in Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TMWBBench = factory();
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


  /* ---------- value converter ---------- */
  var PREFIX_ROWS = [['giga (G)', 1e9, 'G'], ['mega (M)', 1e6, 'M'], ['kilo (k)', 1e3, 'k'], ['base unit', 1, ''], ['milli (m)', 1e-3, 'm'], ['micro (\u00b5)', 1e-6, '\u00b5'], ['nano (n)', 1e-9, 'n'], ['pico (p)', 1e-12, 'p']];
  function convertValue(v, unit) {
    if (!isFinite(v)) return { error: 'Enter a number, with an optional prefix such as 4.7u or 2.2k.' };
    var rows = PREFIX_ROWS.map(function (p) { return [p[0], String(Number((v / p[1]).toPrecision(8))) + ' ' + p[2] + unit]; });
    return { eng: fmt(v, unit, 4), sci: v.toExponential(4), rows: rows };
  }

  /* ---------- frequency, period, wavelength ---------- */
  var C0 = 299792458;
  function freqPeriod(o) {
    if (!(o.value > 0)) return { error: 'Enter a value above zero.' };
    var f = o.mode === 'f' ? o.value : 1 / o.value, t = 1 / f, vf = o.vf > 0 && o.vf <= 1 ? o.vf : 1, lam = C0 * vf / f;
    return { f: f, t: t, lambda: lam, quarter: lam / 4, half: lam / 2, vf: vf };
  }

  /* ---------- number bases ---------- */
  var BASES = { dec: [10, /^[0-9]+$/], hex: [16, /^[0-9a-f]+$/i], bin: [2, /^[01]+$/], oct: [8, /^[0-7]+$/] };
  function numberBases(o) {
    var text = String(o.text == null ? '' : o.text).replace(/[\s_]/g, '').replace(/^0x/i, '').replace(/^0b/i, '');
    var b = BASES[o.base];
    if (!text) return { error: 'Enter a number.' };
    if (!b || !b[1].test(text)) return { error: 'That is not a valid ' + ({ dec: 'decimal', hex: 'hexadecimal', bin: 'binary', oct: 'octal' }[o.base] || '') + ' number.' };
    var n = BigInt(b[0] === 10 ? text : (b[0] === 16 ? '0x' : b[0] === 2 ? '0b' : '0o') + text);
    if (n > (BigInt(1) << BigInt(64)) - BigInt(1)) return { error: 'Numbers above 64 bits are not supported.' };
    var bin = n.toString(2), pad = bin.length % 4 ? 4 - bin.length % 4 : 0, grouped = ('0'.repeat(pad) + bin).replace(/(.{4})(?=.)/g, '$1 ');
    var bits = bin.length, r = { dec: n.toString(10), hex: '0x' + n.toString(16).toUpperCase(), bin: '0b' + bin, binGrouped: grouped, oct: '0o' + n.toString(8), bits: bits, bytes: Math.ceil(bits / 8) };
    [8, 16, 32].forEach(function (w) {
      var mod = BigInt(1) << BigInt(w);
      if (n < mod) r['int' + w] = (n >= (mod >> BigInt(1)) ? n - mod : n).toString(10);
    });
    var c = Number(n); if (n <= BigInt(126) && c >= 32) r.ascii = String.fromCharCode(c);
    return r;
  }

  /* ---------- E-series finder ---------- */
  function eSeriesFinder(o) {
    if (!(o.value > 0)) return { error: 'Enter a value above zero.' };
    var rows = ['E6', 'E12', 'E24', 'E48', 'E96'].map(function (s) {
      var nr = nearest(s, o.value, 'nearest'), dn = nearest(s, o.value, 'down'), up = nearest(s, o.value, 'up');
      return { series: s, below: dn, nearest: nr, above: up, errPct: (nr - o.value) / o.value * 100 };
    });
    var combos = findCombo({ target: o.value, series: o.series || 'E24' });
    return { rows: rows, combos: combos.list || [] };
  }

  /* ---------- I2C addresses (7-bit) ---------- */
  function range(a, b) { var r = [], i; for (i = a; i <= b; i++) r.push(i); return r; }
  var I2C = [
    ['SSD1306 OLED', 'Display', [0x3C, 0x3D], 'Most 128x64 modules are 0x3C. Some have a solder jumper for 0x3D.'],
    ['SH1106 OLED', 'Display', [0x3C, 0x3D], ''],
    ['PCF8574 I/O expander (LCD backpack)', 'I/O expander', range(0x20, 0x27), 'A0 to A2 pins set the address. Common on 1602 LCD backpacks (usually 0x27).'],
    ['PCF8574A I/O expander (LCD backpack)', 'I/O expander', range(0x38, 0x3F), 'A-version chip. LCD backpacks with it are usually 0x3F.'],
    ['MCP23017 I/O expander', 'I/O expander', range(0x20, 0x27), 'Same range as the PCF8574, so they conflict.'],
    ['HT16K33 LED driver', 'Display driver', range(0x70, 0x77), 'Used in Adafruit LED backpacks.'],
    ['BMP280 pressure', 'Sensor', [0x76, 0x77], 'SDO pin selects the address.'],
    ['BME280 pressure, temperature, humidity', 'Sensor', [0x76, 0x77], 'SDO pin selects the address.'],
    ['BME680 gas, pressure, humidity', 'Sensor', [0x76, 0x77], ''],
    ['BMP180 pressure', 'Sensor', [0x77], 'Fixed address.'],
    ['MPU-6050 / MPU-9250 IMU', 'Sensor', [0x68, 0x69], 'AD0 pin selects the address. Conflicts with DS1307 and DS3231 at 0x68.'],
    ['DS1307 real-time clock', 'RTC', [0x68], 'Fixed address. Conflicts with the MPU-6050 default.'],
    ['DS3231 real-time clock', 'RTC', [0x68], 'Fixed address. Many modules add an AT24C32 EEPROM at 0x57.'],
    ['AT24Cxx EEPROM', 'Memory', range(0x50, 0x57), 'A0 to A2 pins set the address.'],
    ['ADS1115 / ADS1015 ADC', 'ADC', range(0x48, 0x4B), 'ADDR pin to GND, VDD, SDA, or SCL selects the address.'],
    ['PCF8591 ADC / DAC', 'ADC', range(0x48, 0x4F), 'Same range as the ADS1115.'],
    ['MCP4725 DAC', 'DAC', [0x60, 0x61], 'A0 pin selects the address (some variants differ).'],
    ['INA219 current monitor', 'Power', range(0x40, 0x4F), 'A0 and A1 pins set the address.'],
    ['INA226 current monitor', 'Power', range(0x40, 0x4F), ''],
    ['PCA9685 16-channel PWM', 'Driver', [0x40], 'Default 0x40. Six address pins allow up to 0x7F, so boards can be set to many addresses. Also responds to an all-call address at 0x70.'],
    ['HTU21D / SHT21 humidity', 'Sensor', [0x40], 'Fixed address. Conflicts with INA219 and PCA9685 defaults.'],
    ['Si7021 humidity', 'Sensor', [0x40], 'Fixed address.'],
    ['SHT31 humidity', 'Sensor', [0x44, 0x45], 'ADDR pin selects the address.'],
    ['AHT10 / AHT20 humidity', 'Sensor', [0x38], 'Fixed address. Conflicts with the PCF8574A range.'],
    ['BH1750 light', 'Sensor', [0x23, 0x5C], 'ADDR pin selects the address.'],
    ['TSL2561 light', 'Sensor', [0x29, 0x39, 0x49], 'ADDR pin floating, GND, or VDD.'],
    ['TCS34725 color', 'Sensor', [0x29], 'Fixed address. Same as VL53L0X.'],
    ['VL53L0X / VL53L1X time-of-flight', 'Sensor', [0x29], 'Default 0x29. The address can be changed in software.'],
    ['APDS-9960 gesture and color', 'Sensor', [0x39], 'Fixed address.'],
    ['HMC5883L compass', 'Sensor', [0x1E], 'Fixed address. Many cheap "HMC5883L" modules actually have a QMC5883L (0x0D).'],
    ['QMC5883L compass', 'Sensor', [0x0D], ''],
    ['ADXL345 accelerometer', 'Sensor', [0x53, 0x1D], 'ALT ADDRESS pin selects.'],
    ['LIS3DH accelerometer', 'Sensor', [0x18, 0x19], 'SDO pin selects.'],
    ['LSM6DS3 IMU', 'Sensor', [0x6A, 0x6B], 'SDO pin selects.'],
    ['BNO055 orientation', 'Sensor', [0x28, 0x29], 'COM3 pin selects.'],
    ['MAX30102 pulse oximeter', 'Sensor', [0x57], 'Fixed address. Conflicts with AT24C32 EEPROM at 0x57.'],
    ['MLX90614 IR thermometer', 'Sensor', [0x5A], 'Default 0x5A, changeable.'],
    ['CCS811 air quality', 'Sensor', [0x5A, 0x5B], 'ADDR pin selects. Conflicts with MLX90614 at 0x5A.'],
    ['AMG8833 thermal camera', 'Sensor', [0x68, 0x69], 'AD_SELECT pin selects.'],
    ['TMP102 temperature', 'Sensor', range(0x48, 0x4B), 'ADD0 pin selects the address.'],
    ['LM75 temperature', 'Sensor', range(0x48, 0x4F), ''],
    ['MCP9808 temperature', 'Sensor', range(0x18, 0x1F), 'A0 to A2 pins set the address.'],
    ['TCA9548A I2C multiplexer', 'Bus', range(0x70, 0x77), 'Use it to run several devices with the same address.'],
    ['PN532 NFC reader', 'RFID', [0x24], 'Fixed address.'],
    ['MAX17048 fuel gauge', 'Power', [0x36], 'Fixed address.']
  ];
  function hex2(n) { return '0x' + (n < 16 ? '0' : '') + n.toString(16).toUpperCase(); }
  function addrText(a) {
    if (a.length > 2 && a[a.length - 1] - a[0] === a.length - 1) return hex2(a[0]) + ' to ' + hex2(a[a.length - 1]);
    return a.map(hex2).join(', ');
  }
  function i2cSearch(q) {
    q = String(q || '').trim().toLowerCase();
    var list = I2C.map(function (d) { return { name: d[0], type: d[1], addrs: d[2], addrText: addrText(d[2]), notes: d[3] }; });
    if (!q) return list;
    var addr = /^(0x)?[0-9a-f]{1,2}$/i.test(q) && (/^0x/i.test(q) || /[a-f]/i.test(q) || q.length === 2) ? parseInt(q.replace(/^0x/i, ''), 16) : null;
    return list.filter(function (d) {
      if (addr !== null && d.addrs.indexOf(addr) >= 0) return true;
      return (d.name + ' ' + d.type + ' ' + d.notes).toLowerCase().indexOf(q) >= 0;
    });
  }
  function i2cByAddresses(text) {
    var parts = String(text || '').split(/[\s,;]+/).filter(Boolean), out = [], bad = [];
    parts.forEach(function (p) {
      var s = p.replace(/^0x/i, ''), n = /^[0-9a-f]{1,2}$/i.test(s) ? parseInt(s, 16) : NaN;
      if (!(n >= 0 && n <= 127)) { bad.push(p); return; }
      out.push({ addr: n, devices: I2C.filter(function (d) { return d[2].indexOf(n) >= 0; }).map(function (d) { return d[0]; }) });
    });
    if (!out.length) return { error: bad.length ? 'Those are not valid 7-bit addresses (0x00 to 0x7F).' : 'Enter the addresses your scanner found, like 0x3C 0x68.' };
    return { list: out, bad: bad };
  }

  /* ---------- cheat sheet data ---------- */
  var COLORS = [
    ['Black', '#000000', 0, '\u00d71', '', '250'], ['Brown', '#7a3e12', 1, '\u00d710', '\u00b11 %', '100'], ['Red', '#d62828', 2, '\u00d7100', '\u00b12 %', '50'],
    ['Orange', '#ff8c00', 3, '\u00d71 k', '', '15'], ['Yellow', '#f6d90b', 4, '\u00d710 k', '', '25'], ['Green', '#2e9e44', 5, '\u00d7100 k', '\u00b10.5 %', ''],
    ['Blue', '#1f5fd6', 6, '\u00d71 M', '\u00b10.25 %', '10'], ['Violet', '#8a3fd1', 7, '\u00d710 M', '\u00b10.1 %', '5'], ['Grey', '#888888', 8, '\u00d7100 M', '\u00b10.05 %', ''],
    ['White', '#ffffff', 9, '\u00d71 G', '', ''], ['Gold', '#cfa72a', '', '\u00d70.1', '\u00b15 %', ''], ['Silver', '#c0c0c0', '', '\u00d70.01', '\u00b110 %', '']
  ];
  var CAP_CODES = [['100', '10 pF'], ['101', '100 pF'], ['102', '1 nF'], ['103', '10 nF'], ['104', '100 nF'], ['105', '1 \u00b5F'], ['223', '22 nF'], ['333', '33 nF'], ['473', '47 nF'], ['474', '470 nF'], ['224', '220 nF'], ['475', '4.7 \u00b5F']];
  var CAP_TOL = [['B', '\u00b10.1 pF'], ['C', '\u00b10.25 pF'], ['D', '\u00b10.5 pF'], ['F', '\u00b11 %'], ['G', '\u00b12 %'], ['J', '\u00b15 %'], ['K', '\u00b110 %'], ['M', '\u00b120 %'], ['Z', '\u221220 % / +80 %']];
  var LOGIC_SHEET = [['ATmega328P at 5 V', '4.0', '0.9', '3.0', '1.5', '5.5'], ['ESP32 at 3.3 V', '2.64', '0.33', '2.475', '0.825', '3.6'], ['5 V TTL (74LS)', '2.7', '0.4', '2.0', '0.8', '5.5'],
    ['74HCT at 5 V', '4.4', '0.1', '2.0', '0.8', '5.5'], ['74HC / CD4000 at 5 V', '4.4', '0.1', '3.5', '1.5', '5.5'], ['3.3 V LVTTL', '2.4', '0.4', '2.0', '0.8', '3.6']];
  var AWG_ROWS = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30].map(function (n) {
    var d = awgDiameterMm(n), a = Math.PI / 4 * d * d;
    return { awg: n, d: d, area: a, perM: RHO_CU / (a * 1e-6) };
  });

  return { SERIES: SERIES, seriesValues: seriesValues, nearest: nearest, fmt: fmt, parse: parse, convertValue: convertValue, freqPeriod: freqPeriod, C0: C0, numberBases: numberBases,
    eSeriesFinder: eSeriesFinder, findCombo: findCombo, I2C: I2C, i2cSearch: i2cSearch, i2cByAddresses: i2cByAddresses, hex2: hex2, addrText: addrText,
    COLORS: COLORS, CAP_CODES: CAP_CODES, CAP_TOL: CAP_TOL, LOGIC_SHEET: LOGIC_SHEET, AWG_ROWS: AWG_ROWS, awgDiameterMm: awgDiameterMm };
});
