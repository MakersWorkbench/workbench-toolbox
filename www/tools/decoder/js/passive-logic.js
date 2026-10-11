/* Copyright 2026 TheMakersWorkbench.com. Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE. */
/* TMWB passive-part marking logic: potentiometers, resistor networks, varistors, thermistors, fuses, ferrite beads, trimmer capacitors. */
(function (root) {
  'use strict';

  function trim(x) { return Number(x.toPrecision(6)).toString(); }
  function fmtOhms(v) {
    if (v === 0) return '0 Ω';
    var u = [[1e9, 'GΩ'], [1e6, 'MΩ'], [1e3, 'kΩ']];
    for (var i = 0; i < u.length; i++) if (v >= u[i][0] * 0.9999999) return trim(v / u[i][0]) + ' ' + u[i][1];
    return trim(v) + ' Ω';
  }
  var RTOL = { B: 0.1, C: 0.25, D: 0.5, F: 1, G: 2, J: 5, K: 10, M: 20 };

  /* "103", "1002", "10K", "4K7", "4R7", "2M2", "47" -> ohms, or null */
  function ohmsFromCode(t) {
    var m;
    if ((m = t.match(/^(\d+(?:\.\d+)?)([RKM])$/))) return Number(m[1]) * ({ R: 1, K: 1e3, M: 1e6 })[m[2]];
    if ((m = t.match(/^(\d*)([RKM])(\d*)$/)) && (m[1] || m[3])) return Number((m[1] || '0') + '.' + (m[3] || '0')) * ({ R: 1, K: 1e3, M: 1e6 })[m[2]];
    if (/^\d{3}$/.test(t)) return Number(t.slice(0, 2)) * Math.pow(10, Number(t[2]));
    if (/^\d{4}$/.test(t)) return Number(t.slice(0, 3)) * Math.pow(10, Number(t[3]));
    if (/^\d{1,2}$/.test(t)) return Number(t);
    return null;
  }

  /* ---------- Potentiometers and trimmers ---------- */
  var TAPER = {
    A: ['Logarithmic (audio) taper', 'Resistance changes slowly at first and faster at the end, matching how ears hear loudness. Use for volume controls.'],
    B: ['Linear taper', 'Resistance changes evenly with rotation. Use for tone, brightness, general settings, and as a voltage divider.'],
    C: ['Reverse logarithmic taper', 'Rare. Changes fast at first and slowly at the end.'],
    W: ['Linear multi-turn (W)', 'W is used by some makers (for example Bourns 3296W) for a linear multi-turn trimmer.']
  };
  function pot(input) {
    var s = String(input || '').toUpperCase().replace(/[\s\-_]/g, ''), taper = null, steps = [], notes = [];
    if (!s) return { error: 'Type the marking, for example B103, A504, 10KB, 103, or 3296W-103.' };
    s = s.replace(/OHMS?|Ω/g, '');
    if (/LIN(EAR)?/.test(s)) { taper = 'B'; s = s.replace(/LIN(EAR)?/, ''); }
    else if (/LOG|AUDIO/.test(s)) { taper = 'A'; s = s.replace(/LOG|AUDIO/, ''); }
    var m = s.match(/^(?:\d{4}|3386|3296|3362|3386P)?(W)?-?/);
    s = s.replace(/^(3296|3386|3362|3006|3005)([A-Z]?)-?/, function (a, b, c) { if (c === 'W') taper = taper || 'W'; return ''; });
    if (!taper && (m = s.match(/^([ABCW])(?=\d)/))) { taper = m[1]; s = s.slice(1); }
    else if (!taper && (m = s.match(/(?<=\d|K|M|R)([ABCW])$/))) { taper = m[1]; s = s.slice(0, -1); }
    var ohms = ohmsFromCode(s);
    if (ohms == null) return { error: '"' + s + '" is not a value I can read. Try 103 (10 kΩ), 504 (500 kΩ), 10K, or 4K7.' };
    if (/^\d{3,4}$/.test(s)) steps.push('Value code ' + s + ': digits ' + s.slice(0, s.length - 1) + ' × 10^' + s[s.length - 1] + ' = ' + fmtOhms(ohms) + '.');
    else steps.push('Value read as ' + fmtOhms(ohms) + '.');
    var t = taper ? TAPER[taper] : null;
    if (t) { steps.push('Taper letter ' + taper + ': ' + t[0] + '.'); }
    else notes.push('No taper letter found. Most pots print one (A or B), and the order of the letters differs between makers.');
    notes.push('Caution: parts made in Asia and the US are usually marked A = logarithmic, B = linear, C = reverse log. Some European parts use A for linear, B or C for log, and F for reverse log, and codes vary by maker. If it matters, test it: at mid-rotation a linear pot reads about half its value, a log pot reads much less.');
    notes.push('Tolerance is usually ±20% for panel pots and ±10% for trimmers.');
    return { ohms: ohms, taper: taper, taperName: t ? t[0] : 'Not marked', taperUse: t ? t[1] : '', steps: steps, notes: notes, tolMin: ohms * 0.8, tolMax: ohms * 1.2 };
  }

  /* ---------- Resistor networks / arrays ---------- */
  function network(input, pins, circuit) {
    var s = String(input || '').toUpperCase().replace(/[\s\-_]/g, '').replace(/Ω|OHMS?/g, ''), m, prefix = null, tol = null, steps = [], notes = [];
    if (!s) return { error: 'Type the marking, for example 103, A103G, 4.7K, or 1002.' };
    if ((m = s.match(/^([A-Z])(?=\d{3,4}[A-Z]?$)/))) { prefix = m[1]; s = s.slice(1); }
    if ((m = s.match(/^(\d{3,4})([BCDFGJKM])$/))) { tol = RTOL[m[2]]; steps.push('Tolerance letter ' + m[2] + ' = ±' + tol + '%.'); s = m[1]; }
    var ohms = ohmsFromCode(s);
    if (ohms == null) return { error: '"' + s + '" is not a value I can read. Try 103 (10 kΩ), 472 (4.7 kΩ), or 1002.' };
    steps.unshift('Value code ' + s + ' = ' + fmtOhms(ohms) + ' per resistor.');
    if (prefix) notes.push('The leading letter ' + prefix + ' often indicates the circuit type (bussed or isolated), but the letters differ between makers. Measure to be sure.');
    var n = pins - (circuit === 'bussed' ? 1 : 0), res;
    var l = [];
    if (circuit === 'bussed') {
      res = { count: pins - 1, common: 'Pin 1 (marked with a dot or stripe) is the common pin.', p1: ohms, between: 2 * ohms, parallel: ohms / (pins - 1) };
    } else {
      res = { count: Math.floor(pins / 2), common: 'Each resistor has its own two pins, such as pins 1 and 8 on an 8-pin part.' };
    }
    notes.push('Quick check with a meter. Bussed: pin 1 to any other pin reads the value, and any two non-common pins read double. Isolated: only the paired pins read the value.');
    return { ohms: ohms, tol: tol, steps: steps, notes: notes, net: res, pins: pins, circuit: circuit };
  }

  /* ---------- Varistors (MOVs) ---------- */
  var VTOL = { K: 10 };
  function varistor(input) {
    var s = String(input || '').toUpperCase().replace(/[\s\-_]/g, ''), m, steps = [], notes = [], dia, v1, tolL = null, vac = null;
    if (!s) return { error: 'Type the marking, for example 14D471K, 10D391K, 7N271K, or S14K275.' };
    if ((m = s.match(/^S(\d{2})K(\d{2,3})$/))) {                 /* EPCOS / TDK SIOV: S14K275 */
      dia = Number(m[1]); vac = Number(m[2]); tolL = 'K'; v1 = vac / 0.64;
      steps.push('SIOV style: S, then ' + dia + ' mm disc, K = ±10%, then 275 style number = maximum AC working voltage (' + vac + ' V RMS).');
      steps.push('Estimated varistor voltage at 1 mA is about ' + Math.round(v1 / 5) * 5 + ' V (AC rating ÷ 0.64).');
    } else if ((m = s.match(/^(\d{1,2})([DNKUV]?)(\d{3})([KLMP])?$/))) {
      dia = Number(m[1]); v1 = Number(m[3].slice(0, 2)) * Math.pow(10, Number(m[3][2]));
      steps.push(dia + ' = disc diameter in mm' + (m[2] ? ' (series letter ' + m[2] + ')' : '') + '.');
      steps.push('Code ' + m[3] + ': ' + m[3].slice(0, 2) + ' × 10^' + m[3][2] + ' = ' + v1 + ' V varistor voltage (measured at 1 mA DC).');
      if (m[4]) { if (VTOL[m[4]]) { tolL = m[4]; steps.push('Tolerance letter ' + m[4] + ' = ±' + VTOL[m[4]] + '% on that voltage.'); } else steps.push('Tolerance letter ' + m[4] + ' is not a code I can confirm. K = ±10% is the standard one, so check the datasheet.'); }
      vac = v1 * 0.64;
    } else return { error: '"' + s + '" does not match a varistor marking. Try 14D471K or S14K275.' };
    var vacR = Math.round(vac / 5) * 5, vdcR = Math.round(v1 * 0.82 / 5) * 5;
    notes.push('A varistor is a surge protector: it conducts only above its rated voltage and shunts the spike away. It wears out with each large surge, so always fuse the line in series.');
    notes.push('Bigger disc diameter means more surge energy and current handling. Choose the AC rating at least 10 to 15% above your normal supply voltage: about 150 V for 120 V mains and 275 V for 230 V mains.');
    return { dia: dia, v1: v1, tol: tolL ? VTOL[tolL] : null, vac: vacR, vdc: vdcR,
      fits120: vacR >= 150, fits230: vacR >= 275, clampLow: v1 * 1.6, clampHigh: v1 * 1.8, steps: steps, notes: notes };
  }

  /* ---------- Thermistors ---------- */
  function thermistor(input, tempC) {
    var s = String(input || '').toUpperCase().trim(), steps = [], notes = [], m, type = 'NTC', b = null, r25;
    if (!s) return { error: 'Type the marking, for example 103, NTC 10K B3950, 103AT-2, or 10D-9.' };
    if (/PTC/.test(s)) { type = 'PTC'; s = s.replace(/PTC/, ''); } else s = s.replace(/NTC/, '');
    if ((m = s.match(/^(\d+(?:\.\d+)?)\s*D-?\s*(\d{1,2})$/))) {                    /* inrush limiter 10D-9 */
      r25 = Number(m[1]);
      steps.push('Inrush-limiter style: ' + m[1] + ' = ' + fmtOhms(r25) + ' at 25 °C, ' + m[2] + ' = body diameter in mm.');
      notes.push('These large NTC discs are used in series with a power supply to limit the surge when it is switched on. As they warm up, their resistance drops to a fraction of an ohm. They get hot in normal use, so mount them clear of other parts.');
      return { type: 'NTC (inrush limiter)', r25: r25, b: null, steps: steps, notes: notes, table: null, inrush: true };
    }
    if ((m = s.match(/B\s*=?\s*(\d{4})/))) { b = Number(m[1]); steps.push('B value (beta) ' + b + ' K read from the marking.'); s = s.replace(m[0], ' '); }
    else if ((m = s.match(/\b(\d{4})\b(?=\s*$)/)) && Number(m[1]) >= 2000 && Number(m[1]) <= 5000 && /\s/.test(s.trim())) { b = Number(m[1]); steps.push('B value ' + b + ' K read from the marking.'); s = s.replace(m[0], ' '); }
    var tok = s.trim().split(/[\s,]+/)[0].replace(/[A-Z]{2}-?\d*$/, '').replace(/^MF\d+/, '');
    r25 = ohmsFromCode(tok);
    if (r25 == null) return { error: 'Could not find the resistance in "' + input + '". Try 103 (10 kΩ at 25 °C), 10K, or 502.' };
    if (/^\d{3,4}$/.test(tok)) steps.unshift('Value code ' + tok + ' = ' + fmtOhms(r25) + ' at 25 °C.'); else steps.unshift('Resistance ' + fmtOhms(r25) + ' at 25 °C.');
    var assumed = false;
    if (type === 'NTC' && b == null && /103AT/.test(String(input).toUpperCase())) { b = 3435; steps.push('Semitec 103AT series: B25/85 = 3435 K.'); }
    if (type === 'NTC' && b == null) { b = 3950; assumed = true; steps.push('No B value printed, so the common 3950 K for 10 kΩ NTC probes is assumed.'); }
    var table = null, at = null;
    if (type === 'NTC') {
      var R = function (T) { return r25 * Math.exp(b * (1 / (T + 273.15) - 1 / 298.15)); };
      table = [-20, 0, 25, 50, 75, 100, 125].map(function (T) { return [T, R(T)]; });
      if (tempC != null && isFinite(tempC)) at = { t: tempC, r: R(tempC) };
      notes.push('Resistance falls as temperature rises. The table uses the simple beta equation, which is accurate to a few percent near 25 °C and less so at the extremes. For precise work use the maker\'s R-T table.');
    } else {
      notes.push('A PTC thermistor rises sharply in resistance above its switching temperature, so it is used for self-resetting overcurrent protection and heaters. The marking is the cold resistance at 25 °C.');
    }
    return { type: type, r25: r25, b: b, assumed: assumed, table: table, at: at, steps: steps, notes: notes };
  }

  /* ---------- Fuses ---------- */
  var SPEED = { FF: ['FF', 'Very fast-acting', 'Opens almost instantly. For delicate semiconductor and meter circuits.'],
    F: ['F', 'Fast-acting', 'Opens quickly on overload. For general electronics with no big surge current.'],
    M: ['M', 'Medium time-lag', 'Tolerates small surges, then opens.'],
    T: ['T', 'Time-lag (slow-blow)', 'Rides through the brief inrush current of motors, transformers, and power supplies, but still opens on a sustained overload.'],
    TT: ['TT', 'Long time-lag', 'Even more surge tolerant than T.'] };
  var BREAK = { H: 'High breaking capacity (tested at 1500 A, usually ceramic body)', E: 'Enhanced breaking capacity (tested at 150 A)', L: 'Low breaking capacity (tested at 35 A or 10 × rated current, whichever is greater, usually glass body)' };
  function fuse(input) {
    var raw = String(input || '').trim().toUpperCase(), s = raw.replace(/\s+/g, ''), m, steps = [], notes = [], volt = null, ac = null;
    if (!s) return { error: 'Type the marking, for example T2A 250V, F500mA 250V, T2AL250V, MF-R110, or 1812L110.' };
    if ((m = s.match(/^MF-?R(\d{3,4})$/))) {
      var h = Number(m[1]) / 100;
      steps.push('Bourns MF-R style resettable PTC fuse: R' + m[1] + ' = ' + h + ' A hold current.');
      notes.push('Resettable (PTC) fuses "trip" to high resistance on overload and reset after the fault is removed and the part cools. Trip current is typically about twice the hold current.');
      return { kind: 'ptc', hold: h, trip: h * 2, steps: steps, notes: notes };
    }
    if ((m = s.match(/^(\d{4})L(\d{3})(?:\/(\d+))?$/))) {
      var h2 = Number(m[2]) / 100;
      steps.push('Littelfuse-style SMD resettable fuse: ' + m[1] + ' = case size, L' + m[2] + ' = ' + h2 + ' A hold current' + (m[3] ? ', ' + m[3] + ' V max' : '') + '.');
      notes.push('Resettable (PTC) fuses "trip" to high resistance on overload and reset after the fault clears. Trip current is typically about twice the hold current.');
      return { kind: 'ptc', hold: h2, trip: h2 * 2, volt: m[3] ? Number(m[3]) : null, steps: steps, notes: notes };
    }
    if ((m = s.match(/(\d+)(?:V)(AC|DC)?/))) { volt = Number(m[1]); ac = m[2] || null; s = s.replace(m[0], ''); }
    if (!(m = s.match(/^(FF|TT|F|M|T)?(\d*\.?\d+)(MA|A)([HLE])?$/))) {
      if (!(m = s.match(/^(\d*\.?\d+)(MA|A)(FF|TT|F|M|T)?([HLE])?$/))) return { error: 'Could not read "' + raw + '". Try T2A 250V, F500mA 250V, or T2AL250V.' };
      m = [m[0], m[3], m[1], m[2], m[4]];
    }
    var sp = m[1] ? SPEED[m[1]] : null, amps = Number(m[2]) * (m[3] === 'MA' ? 0.001 : 1), br = m[4] || null;
    steps.push('Current rating: ' + (amps < 1 ? Number((amps * 1000).toPrecision(4)) + ' mA' : Number(amps.toPrecision(4)) + ' A') + '.');
    if (sp) steps.push('Speed letter ' + sp[0] + ': ' + sp[1] + '.');
    if (br) steps.push('Breaking-capacity letter ' + br + ': ' + BREAK[br] + '.');
    if (volt != null) steps.push('Voltage rating: ' + volt + ' V' + (ac ? ' ' + ac : '') + '.');
    notes.push('The voltage is the highest the fuse can safely interrupt, not an operating setting. A fuse rated for AC may not clear a DC fault at the same voltage. Never fit a higher current or voltage rating than the circuit calls for, and never bridge a blown fuse.');
    if (sp && sp[0] === 'T') notes.push('Slow-blow fuses can take several times their rating briefly, so they suit inrush loads. Use a fast fuse when you need quick protection.');
    return { kind: 'fuse', amps: amps, speed: sp, br: br ? BREAK[br] : null, volt: volt, ac: ac, steps: steps, notes: notes };
  }

  /* ---------- Ferrite beads ---------- */
  var BLMSIZE = { '15': '0402', '18': '0603', '21': '0805', '41': '1806' };
  function ferrite(input) {
    var s = String(input || '').toUpperCase().replace(/[\s\-_]/g, ''), m, z, steps = [], notes = [], size = null;
    if (!s) return { error: 'Type the marking or part number, for example 121, 601, 600R, or BLM18AG601SN1.' };
    if ((m = s.match(/^BLM(\d{2})([A-Z]{2})(\d{3}|\d+R\d*|R\d+)([A-Z]{2}\d)?/))) {
      size = BLMSIZE[m[1]]; z = m[3];
      steps.push('Murata BLM series, size code ' + m[1] + (size ? ' = ' + size + ' (inch) package' : ' (not in my size table, see the datasheet)') + ', type letters ' + m[2] + '.');
    } else z = s;
    var ohms;
    if ((m = z.match(/^(\d*)R(\d*)$/)) && (m[1] || m[2])) ohms = Number((m[1] || '0') + '.' + (m[2] || '0'));
    else if (/^\d{3}$/.test(z)) ohms = Number(z.slice(0, 2)) * Math.pow(10, Number(z[2]));
    else return { error: '"' + z + '" is not a value I can read. Try 121 (120 Ω), 601 (600 Ω), or 600R.' };
    steps.push('Impedance code ' + z + ' = ' + fmtOhms(ohms) + ' measured at 100 MHz.');
    notes.push('A ferrite bead is mostly resistive at high frequency, so it turns unwanted RF noise into a little heat. At DC it is nearly a plain wire. The rating is impedance at 100 MHz, not DC resistance.');
    notes.push('Most small SMD beads are unmarked. This decoder is for printed codes and for part numbers like Murata BLM. Check the datasheet for the DC resistance and the rated current, which limit where the bead can be used.');
    return { ohms: ohms, size: size, steps: steps, notes: notes };
  }

  /* ---------- Trimmer capacitors ---------- */
  function trimcap(input) {
    var s = String(input || '').trim(), m, notes = [], steps = [];
    if (!s) return { error: 'Type the printed range, for example 5-30, 2-10pF, or 10~40.' };
    if (!(m = s.replace(/\s+/g, '').match(/^(\d+(?:\.\d+)?)[-~–](\d+(?:\.\d+)?)(pF|P)?$/i))) return { error: 'Could not read "' + s + '". Try 5-30 or 2-10pF.' };
    var lo = Number(m[1]), hi = Number(m[2]);
    if (lo >= hi) return { error: 'The first number should be smaller than the second.' };
    steps.push('Printed range ' + lo + ' to ' + hi + ' pF: the capacitance you can set by turning the screw.');
    notes.push('Body color codes for trimmer capacitors vary by manufacturer, so a color alone is not reliable. Read the printed range, or look the part up by its series and color in the maker\'s datasheet.');
    notes.push('To tune, use a plastic or ceramic (non-metal) alignment tool, because a metal screwdriver changes the capacitance while you hold it. The metal screw side is usually the one to connect to ground or the lower-impedance node.');
    return { lo: lo, hi: hi, mid: (lo + hi) / 2, steps: steps, notes: notes };
  }

  var api = { pot: pot, network: network, varistor: varistor, thermistor: thermistor, fuse: fuse, ferrite: ferrite, trimcap: trimcap, fmtOhms: fmtOhms };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PassiveLogic = api;
})(this);
