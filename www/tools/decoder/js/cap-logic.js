/* Copyright 2026 TheMakersWorkbench.com. Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE. */
/* TMWB Capacitor code logic. No dependencies. Values are carried in picofarads. */
(function (root) {
  'use strict';

  var TOL = {
    B: '±0.1 pF', C: '±0.25 pF', D: '±0.5 pF', F: '±1% (±1 pF below 10 pF)', G: '±2%', H: '±3%',
    J: '±5%', K: '±10%', M: '±20%', P: '+100% / −0%', Z: '+80% / −20%'
  };
  /* EIA voltage codes used on ceramic and film capacitor part numbers */
  var VOLT = { '0E': 2.5, '0G': 4, '0L': 5.5, '0J': 6.3, '1A': 10, '1C': 16, '1D': 20, '1E': 25, '1V': 35, '1G': 40, '1H': 50, '1J': 63, '1M': 70, '1U': 75,
    '2A': 100, '2Q': 110, '2B': 125, '2C': 160, '2Z': 180, '2D': 200, '2P': 220, '2E': 250, '2F': 315, '2V': 350, '2G': 400, '2W': 450, '2J': 630, '2K': 800 };
  /* EIA tantalum SMD voltage letters (lowercase e is 2.5 V, uppercase E is 25 V) */
  var TANT = { e: 2.5, G: 4, J: 6.3, A: 10, C: 16, D: 20, E: 25, V: 35, T: 50, H: 50 };
  /* EIA-198 significant-figure letters (case matters) */
  var E198 = { A: 1.0, B: 1.1, C: 1.2, D: 1.3, E: 1.5, F: 1.6, G: 1.8, H: 2.0, J: 2.2, K: 2.4, L: 2.7, M: 3.0, N: 3.3, P: 3.6, Q: 3.9, R: 4.3,
    S: 4.7, T: 5.1, U: 5.6, V: 6.2, W: 6.8, X: 7.5, Y: 8.2, Z: 9.1, a: 2.6, b: 3.5, d: 4.0, e: 4.5, f: 5.0, m: 6.0, n: 7.0, t: 8.0, y: 9.0 };
  var UNIT = { pf: 1, nf: 1e3, uf: 1e6, 'µf': 1e6, 'μf': 1e6, mf: 1e9 };

  function trim(x) { return Number(x.toPrecision(6)).toString(); }
  function fmt(pf) {
    if (pf >= 1e10) return trim(pf / 1e9) + ' mF';
    if (pf >= 1e6 * 0.9999999) return trim(pf / 1e6) + ' µF';
    if (pf >= 1e3 * 0.9999999) return trim(pf / 1e3) + ' nF';
    return trim(pf) + ' pF';
  }
  function conversions(pf) {
    return { pF: trim(pf), nF: trim(pf / 1e3), uF: trim(pf / 1e6) };
  }
  function tolRange(pf, letter) {
    var lo = pf, hi = pf, p = { F: 1, G: 2, H: 3, J: 5, K: 10, M: 20 };
    if (p[letter] && !(letter === 'F' && pf < 10)) { lo = pf * (1 - p[letter] / 100); hi = pf * (1 + p[letter] / 100); }
    else if (letter === 'F') { lo = pf - 1; hi = pf + 1; }
    else if (letter === 'B') { lo = pf - 0.1; hi = pf + 0.1; }
    else if (letter === 'C') { lo = pf - 0.25; hi = pf + 0.25; }
    else if (letter === 'D') { lo = pf - 0.5; hi = pf + 0.5; }
    else if (letter === 'Z') { lo = pf * 0.8; hi = pf * 1.8; }
    else if (letter === 'P') { lo = pf; hi = pf * 2; }
    return { min: lo, max: hi };
  }

  function pfOf3(d) { var z = Number(d[2]); return Number(d.slice(0, 2)) * (z === 8 ? 0.01 : z === 9 ? 0.1 : Math.pow(10, z)); }
  function threeDigit(d, steps) {
    var sig = Number(d.slice(0, 2)), z = Number(d[2]), mult, label;
    if (z === 8) { mult = 0.01; label = '×0.01 (a 3rd digit of 8 means divide by 100)'; }
    else if (z === 9) { mult = 0.1; label = '×0.1 (a 3rd digit of 9 means divide by 10)'; }
    else { mult = Math.pow(10, z); label = '×10^' + z + ' (add ' + z + ' zero' + (z === 1 ? '' : 's') + ')'; }
    var pf = Number((sig * mult).toPrecision(10));
    steps.push('First two digits: ' + d.slice(0, 2) + ' (significant figures, in pF)');
    steps.push('Third digit: ' + z + ', ' + label);
    steps.push(d.slice(0, 2) + ' ' + label.split(' ')[0] + ' = ' + trim(pf) + ' pF');
    return pf;
  }

  /* Decode a printed marking into {pf, kind, tolLetter, voltage, steps, notes} */
  function decode(input, hint) {
    var s = String(input || '').trim(), steps = [], notes = [], m, voltage = null, tolLetter = null, kind, pf;
    if (!s) return { error: 'Type the marking printed on the capacitor, for example 104, 104K, 2A104J, 107C, 100 16, or 4n7.' };
    s = s.replace(/\d+\s*°\s*C/gi, '').trim();                       /* temperature rating, e.g. 105°C */
    var polar = false;
    if (/\+$/.test(s)) { polar = true; s = s.replace(/\+$/, '').trim(); }  /* printed + beside the positive lead */
    var pm = s.match(/^(\d+(?:\.\d+)?)\s*(?:[uµμ]F)?\s*[\/ ]\s*(\d+(?:\.\d+)?)\s*V?(?:DC)?$/i);
    var printedOK = pm && (/[uµμ]F/i.test(s) || hint === 'elec' || hint === 'tant' || !/^\d{3}$/.test(pm[1]) || /0$/.test(pm[1]));
    if (pm && !printedOK) { s = pm[1]; voltage = Number(pm[2]); pm = null; }
    else if (!pm && (m = s.match(/(\d+(?:\.\d+)?)\s*V(?:DC|dc)?\b/)) && s.length > m[0].length) { voltage = Number(m[1]); s = s.replace(m[0], '').trim(); }
    s = s.replace(/\s+/g, '');

    if (printedOK) {
      kind = 'printed'; pf = Number(pm[1]) * 1e6; voltage = Number(pm[2]);
      steps.push('The value and voltage are printed in full: ' + pm[1] + ' µF, ' + pm[2] + ' V.');
      if (polar) steps.push('The + beside the voltage marks the positive lead.');
      notes.push('Printed values on polarized capacitors are in µF and volts. Check the polarity marking before soldering: tantalum shows the + end, aluminum electrolytics show a stripe or segment on the NEGATIVE end.');
    } else if ((m = s.match(/^(\d{3})([A-Za-z])$/)) && TANT[m[2] === 'e' ? 'e' : m[2].toUpperCase()] != null &&
        (hint === 'tant' || 'AEVTe'.indexOf(m[2] === 'e' ? 'e' : m[2].toUpperCase()) >= 0 || (TANT[m[2].toUpperCase()] != null && 'CDGHJ'.indexOf(m[2].toUpperCase()) >= 0 && pfOf3(m[1]) >= 1e6))) {
      var vl = m[2] === 'e' ? 'e' : m[2].toUpperCase();
      kind = 'tantalum'; voltage = TANT[vl];
      pf = threeDigit(m[1], steps);
      steps.push('Trailing letter ' + vl + ' = ' + voltage + ' V rating (EIA tantalum code)');
      notes.push('A second line, if present, is a lot or date code and can be ignored. On a tantalum chip the stripe or bevel marks the positive (anode) end.');
    } else if ((m = s.match(/^(\d+\.?\d*|\.\d+)(pf|nf|uf|µf|μf|mf)$/i))) {
      pf = Number(m[1]) * UNIT[m[2].toLowerCase()];
      kind = 'value'; steps.push('Written out in full: ' + m[1] + ' ' + m[2].replace(/f$/i, 'F') + '.');
    } else if ((m = s.match(/^(\d*)([pnuµμrPNUR])(\d*)[fF]?$/)) && (m[1] || m[3])) {
      var c = m[2].toLowerCase(), f = Number((m[1] || '0') + '.' + (m[3] || '0'));
      var mul = c === 'n' ? 1e3 : (c === 'u' || c === 'µ' || c === 'μ') ? 1e6 : 1;
      pf = f * mul; kind = 'notation';
      steps.push('The letter ' + m[2] + ' marks the decimal point and the unit (' + (c === 'n' ? 'nanofarads' : (mul === 1e6 ? 'microfarads' : 'picofarads')) + ').');
      steps.push((m[1] || '0') + '.' + (m[3] || '0') + ' ' + (c === 'n' ? 'nF' : mul === 1e6 ? 'µF' : 'pF'));
    } else if ((m = s.match(/^([0-3][A-Za-z])(\d{3})([A-Za-z])?$/)) && VOLT[m[1].toUpperCase()]) {
      var vc = m[1].toUpperCase();
      voltage = VOLT[vc]; kind = 'ceramic';
      steps.push('Voltage code ' + vc + ' = ' + voltage + ' V');
      pf = threeDigit(m[2], steps);
      if (m[3]) tolLetter = m[3].toUpperCase();
    } else if ((m = s.match(/^([A-Za-z])(\d{3})$/)) && TANT[m[1]] != null) {
      kind = 'tantalum'; voltage = TANT[m[1]];
      steps.push('Leading letter ' + m[1] + ' = ' + voltage + ' V rating (EIA tantalum code)');
      pf = threeDigit(m[2], steps);
      notes.push('On a tantalum chip, the end with the bar, stripe, or bevel is the positive (anode) end. Reversing it can destroy the part.');
    } else if ((m = s.match(/^(\d{3})([A-Za-z])?$/))) {
      kind = 'ceramic'; pf = threeDigit(m[1], steps);
      if (m[2]) tolLetter = m[2].toUpperCase();
    } else if ((m = s.match(/^([A-Za-z])(\d)$/)) && E198[m[1]] != null) {
      kind = 'eia198'; var e = E198[m[1]], n = Number(m[2]);
      pf = Number((e * Math.pow(10, n)).toPrecision(10));
      steps.push('EIA-198 two-character code, used on small SMD ceramic and tantalum parts.');
      steps.push('Letter ' + m[1] + ' = ' + e + ' (significant figures)');
      steps.push('Digit ' + n + ' = ×10^' + n + ' (result in pF)');
      steps.push(e + ' × 10^' + n + ' = ' + trim(pf) + ' pF');
      notes.push('These codes are manufacturer-dependent and often come with a date or lot mark. Cross-check with the datasheet when you can.');
      if (m[1] === 'a') notes.push('Lowercase a is listed as 2.6 in the DigiKey EIA-198 reference. Some other tables show 2.5, so confirm with the datasheet.');
    } else if ((m = s.match(/^(\d{1,2})$/))) {
      kind = 'direct'; pf = Number(m[1]);
      steps.push('One or two digits are read directly as picofarads.');
    } else if ((m = s.match(/^(\d+\.\d+|\.\d+)$/))) {
      kind = 'film'; pf = Number(m[1]) * 1e6;
      steps.push('A bare decimal on a film or ceramic capacitor is read in microfarads.');
      notes.push('Assumed µF. A few vendors print decimals in other units, so confirm with a meter if it matters.');
    } else {
      return { error: '"' + s + '" does not match a known capacitor marking. Try 3-digit (104), 3-digit plus tolerance (104K), voltage prefix (2A104J), notation (4n7, 4p7), or tantalum (A106).' };
    }

    var tolText = null, range = null;
    if (tolLetter) {
      if (!TOL[tolLetter]) return { error: 'Tolerance letter ' + tolLetter + ' is not in the standard EIA list (B, C, D, F, G, H, J, K, M, P, Z).' };
      tolText = TOL[tolLetter]; range = tolRange(pf, tolLetter);
      steps.push('Tolerance letter ' + tolLetter + ' = ' + tolText);
    }
    if (kind === 'tantalum') notes.push('Tantalum tolerance is usually ±10% or ±20% and is not part of this marking.');
    if (voltage == null && kind !== 'value') notes.push('No voltage rating is encoded in this marking. Check the datasheet, or use a part rated well above your circuit voltage.');
    return { pf: pf, kind: kind, polar: polar, printed: pm ? [pm[1], pm[2]] : null, tolLetter: tolLetter, tolText: tolText, range: range, voltage: voltage, steps: steps, notes: notes };
  }

  function pow10(e) { return Number('1e' + e); }

  /* "100nF", "0.1u", "4.7p" -> codes */
  function toCode(input) {
    var s = String(input || '').trim().replace(/\s+/g, '').replace(/F$/i, '');
    var m = s.match(/^(\d+\.?\d*|\.\d+)(p|n|u|µ|μ|m)?$/i);
    if (!m) return { error: 'Enter a value with a unit, for example 100nF, 0.1uF, 4.7pF.' };
    var u = (m[2] || 'u').toLowerCase(), pf = Number(m[1]) * (u === 'p' ? 1 : u === 'n' ? 1e3 : u === 'm' ? 1e9 : 1e6);
    if (pf <= 0) return { error: 'Value must be greater than zero.' };
    var codes = [], notes = [];
    if (pf < 10) {
      var r = trim(pf).replace('.', 'R'); if (r.indexOf('R') < 0) r += 'R0';
      codes.push({ label: 'R notation (below 10 pF)', code: r });
      var d9 = Math.round(pf * 10); if (Math.abs(d9 / 10 - pf) < 1e-9 && d9 >= 10 && d9 <= 99) codes.push({ label: '3-digit (3rd digit 9 = ×0.1)', code: String(d9) + '9' });
    } else {
      var e = Math.floor(Math.log10(pf)), mm = e - 1, D = Math.round(pf / pow10(mm));
      if (D >= 100) { D = Math.round(D / 10); mm++; }
      if (mm >= 0 && mm <= 7 && Math.abs(D * pow10(mm) - pf) <= pf * 1e-9) codes.push({ label: '3-digit code', code: String(D) + mm });
      else if (mm < 0) { if (pf < 100 && Math.abs(Math.round(pf) - pf) < 1e-9) codes.push({ label: 'Printed directly (pF)', code: String(Math.round(pf)) }); }
      else return { error: fmt(pf) + ' needs more than 2 significant digits, which a 3-digit code cannot show. Value is usually printed in full.' };
      if (pf < 100 && Math.abs(Math.round(pf) - pf) < 1e-9 && codes[0] && codes[0].code !== String(Math.round(pf))) codes.push({ label: 'Printed directly (pF)', code: String(Math.round(pf)) });
    }
    var n = pf / 1e3, un = pf / 1e6;
    var alt = [];
    if (pf >= 1e3 && pf < 1e6) alt.push({ label: 'nano notation', code: trim(n).replace('.', 'n') + (trim(n).indexOf('.') < 0 ? 'n' : '') });
    if (pf >= 1e6) alt.push({ label: 'micro notation', code: trim(un).replace('.', 'u') + (trim(un).indexOf('.') < 0 ? 'u' : '') });
    if (pf < 1e3 && pf >= 10) alt.push({ label: 'pico notation', code: trim(pf).replace('.', 'p') + (trim(pf).indexOf('.') < 0 ? 'p' : '') });
    if (!codes.length) return { error: 'No 3-digit code exists for ' + fmt(pf) + '.' };
    return { pf: pf, codes: codes.concat(alt), notes: notes };
  }

  var api = { decode: decode, toCode: toCode, format: fmt, conversions: conversions, TOL: TOL, VOLT: VOLT, TANT: TANT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CapLogic = api;
})(this);
