/* Copyright 2026 TheMakersWorkbench.com. Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE. */
/* TMWB part lookup data. Typical values only: always confirm against the manufacturer datasheet.
   Entry: {id, aliases[], cat, title, pkg, polarity|pinout, specs:[[label,value]], use, notes} */
(function (root) {
  'use strict';
  var P = [];
  function add(o) { o.aliases = o.aliases || []; P.push(o); }

  /* ---------- Diodes ---------- */
  var BAND = 'Cathode is the end with the printed band. Current flows from anode (no band) to cathode (band) when forward biased.';
  add({ id: '1N4148', aliases: ['1N914', '1N4448', '1N4148W', 'LL4148'], cat: 'Diode', title: 'Small-signal switching diode',
    pkg: 'DO-35 (glass axial). SMD versions: 1N4148W (SOD-123), LL4148 (MiniMELF).', polarity: BAND,
    specs: [['Forward drop', '≈0.7 V at 10 mA (1 V max)'], ['Max reverse voltage', '100 V repetitive (75 V working)'], ['Max forward current', '200 mA continuous (NXP datasheet); some makers list 300 mA'], ['Recovery time', '≈4 ns, very fast']],
    use: 'The default general-purpose diode: signal clipping, logic steering, flyback protection for tiny relays, reverse-polarity protection on low-current lines.', notes: '1N914 and 1N4448 are close relatives with slightly different test conditions and are interchangeable in most hobby circuits.' });

  var v4 = [50, 100, 200, 400, 600, 800, 1000];
  v4.forEach(function (v, i) {
    add({ id: '1N400' + (i + 1), aliases: [], cat: 'Diode', title: 'General-purpose rectifier diode, 1 A, ' + v + ' V',
      pkg: 'DO-41 (axial plastic)', polarity: BAND,
      specs: [['Forward drop', '≈0.9 V at 1 A (1.1 V max)'], ['Max reverse voltage', v + ' V'], ['Max forward current', '1 A average, 30 A surge (one 8.3 ms cycle)'], ['Recovery time', 'Slow (≈2 µs), for mains frequency only']],
      use: 'Mains rectification, power-supply bridges, reverse-polarity protection, flyback diodes for relays and motors.',
      notes: 'The 1N4001 to 1N4007 family differs only in voltage rating. A 1N4007 can replace any of the others.' });
  });
  var v5 = [[5400, 50], [5401, 100], [5402, 200], [5403, 300], [5404, 400], [5405, 500], [5406, 600], [5407, 800], [5408, 1000]];
  v5.forEach(function (r) {
    add({ id: '1N' + r[0], cat: 'Diode', title: 'Heavy-duty rectifier diode, 3 A, ' + r[1] + ' V', pkg: 'DO-201AD (large axial)', polarity: BAND,
      specs: [['Forward drop', '≈1 V at 3 A (1.2 V max)'], ['Max reverse voltage', r[1] + ' V'], ['Max forward current', '3 A average, 200 A surge'], ['Recovery time', 'Slow, mains frequency only']],
      use: 'Higher-current rectifiers, power supplies, motor flyback protection.', notes: 'Same family idea as the 1N400x series, just built for 3 A.' });
  });
  [['1N5817', 20, 0.45], ['1N5818', 30, 0.55], ['1N5819', 40, 0.6]].forEach(function (r) {
    add({ id: r[0], cat: 'Schottky diode', title: 'Schottky rectifier, 1 A, ' + r[1] + ' V', pkg: 'DO-41 (axial plastic)', polarity: BAND,
      specs: [['Forward drop', r[2] + ' V max at 1 A (Fairchild datasheet), rising to about 0.75 to 0.9 V at 3 A'], ['Max reverse voltage', r[1] + ' V'], ['Max forward current', '1 A average, 25 A surge'], ['Recovery time', 'Essentially instant']],
      use: 'Low-loss rectification and reverse-polarity protection, buck converter catch diodes, solar and battery circuits.', notes: 'Schottky diodes waste less voltage than silicon ones but leak more when reverse biased, especially when hot.' });
  });
  [['SS1', 'SMA (DO-214AC)', '1 A', 'SMA'], ['SS2', 'SMB (DO-214AA)', '2 A', 'SMB'], ['SS3', 'SMC (DO-214AB)', '3 A', 'SMC']].forEach(function (f) {
    [[2, 20], [3, 30], [4, 40], [5, 50], [6, 60]].forEach(function (r) {
      add({ id: f[0] + r[0], aliases: [], cat: 'Schottky diode', title: 'SMD Schottky rectifier, ' + f[2] + ', ' + r[1] + ' V', pkg: f[1],
        polarity: 'Cathode is the end with the stripe on the top of the body.',
        specs: [['Forward drop', r[0] <= 4 ? '≈0.5 to 0.55 V at rated current (varies by maker)' : 'higher than the 40 V parts, check the datasheet'], ['Max reverse voltage', r[1] + ' V'], ['Max forward current', f[2] + ' average'], ['Recovery time', 'Essentially instant']],
        use: 'Compact low-loss rectification, buck/boost converter catch diodes, input reverse-polarity protection.', notes: 'The marking is the part name (for example SS34). Equivalent of a 1N5819-class diode in surface-mount form.' });
    });
  });
  add({ id: 'BAT54', aliases: ['BAT54A', 'BAT54C', 'BAT54S'], cat: 'Schottky diode', title: 'Small-signal Schottky diode, 30 V', pkg: 'SOT-23 (3 pins)',
    polarity: 'BAT54: single diode, pin 1 anode, pin 3 cathode. BAT54A: common anode. BAT54C: common cathode. BAT54S: two diodes in series (middle pin joins them).',
    specs: [['Forward drop', '≈0.3 V at 1 mA and ≈0.4 V at 10 mA (typical, varies by maker); up to about 1 V at 100 mA'], ['Max reverse voltage', '30 V'], ['Max forward current', '200 mA continuous (Diodes Inc.); the ST datasheet lists 300 mA'], ['Recovery time', 'Very fast']],
    use: 'Signal rectification, level protection on logic pins, ORing small supplies, RF detector.', notes: 'Pick the A, C, or S variant by pin arrangement. Check the datasheet for the exact part you bought. SMD marking codes: BAT54 L4, BAT54A L42, BAT54C L43, BAT54S L44 (makers may add a prefix letter).' });
  add({ id: 'BAV99', aliases: ['BAV70'], cat: 'Diode', title: 'Dual small-signal diode (series pair)', pkg: 'SOT-23 (3 pins)',
    polarity: 'BAV99: two diodes in series, pin 1 anode of the first, pin 2 cathode of the second, pin 3 the junction in the middle.',
    specs: [['Forward drop', '1.25 V max at 150 mA'], ['Max reverse voltage', '70 V continuous (some makers list 75 V)'], ['Max forward current', '215 mA per diode'], ['Recovery time', '≈4 ns']],
    use: 'Clamping a signal line to both supply rails for ESD and overvoltage protection, steering diodes.', notes: 'BAV70 is the common-cathode sibling (marked A4, not A7).' });

  /* Zeners 1N4728A to 1N4757A (1 W, DO-41) */
  var zv = [3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1, 10, 11, 12, 13, 15, 16, 18, 20, 22, 24, 27, 30, 33, 36, 39, 43, 47, 51];
  zv.forEach(function (v, i) {
    var n = 4728 + i;
    add({ id: '1N' + n, aliases: ['1N' + n + 'A'], cat: 'Zener diode', title: v + ' V Zener diode, 1 W', pkg: 'DO-41 (axial plastic)',
      polarity: 'Used reverse biased: the banded cathode goes to the positive side, and the diode holds that node near ' + v + ' V.',
      specs: [['Zener voltage', v + ' V (±5% for the "A" suffix, ±10% with no suffix)'], ['Power rating', '1 W'], ['Max zener current', '≈' + Math.round(1000 / v) + ' mA (1 W ÷ ' + v + ' V, less when hot)'], ['Forward drop', '≈0.7 V, like an ordinary diode']],
      use: 'Simple voltage reference, overvoltage clamp, regulating a small load through a series resistor.', notes: 'Size the series resistor so the zener current stays well below the maximum and above the minimum needed to regulate.' });
  });

  /* ---------- Transistors ---------- */
  var TO92 = 'TO-92: hold the flat face toward you, legs down, and read left to right. ';
  add({ id: '2N3904', aliases: ['MMBT3904', 'PN3904'], cat: 'Transistor', title: 'NPN general-purpose transistor', pkg: 'TO-92 (SMD twin: MMBT3904 in SOT-23)',
    pinout: TO92 + 'E, B, C (emitter, base, collector) on onsemi/Fairchild parts. Some older Philips/NXP datasheets list C, B, E.',
    specs: [['Type', 'NPN bipolar'], ['Max Vce', '40 V'], ['Max collector current', '200 mA'], ['Gain (hFE)', '100 to 300 at 10 mA'], ['Power', '625 mW'], ['Speed', '≈300 MHz transition frequency']],
    use: 'Switching small loads (LEDs, small relays through a resistor), small-signal amplification.', notes: 'Pinout can differ between manufacturers. Verify with a datasheet or a meter before powering up.' });
  add({ id: '2N3906', aliases: ['MMBT3906', 'PN3906'], cat: 'Transistor', title: 'PNP general-purpose transistor', pkg: 'TO-92 (SMD twin: MMBT3906 in SOT-23)',
    pinout: TO92 + 'E, B, C (emitter, base, collector) on onsemi/Fairchild parts. Check other makers.',
    specs: [['Type', 'PNP bipolar'], ['Max Vce', '−40 V'], ['Max collector current', '−200 mA'], ['Gain (hFE)', '100 to 300 at 10 mA'], ['Power', '625 mW']],
    use: 'The PNP partner of the 2N3904, used for high-side switching and push-pull pairs.', notes: 'Pinout can differ between manufacturers.' });
  add({ id: 'PN2222A', aliases: ['2N2222', '2N2222A', 'P2N2222A', 'MMBT2222A'], cat: 'Transistor', title: 'NPN medium-current transistor', pkg: 'TO-92 (PN2222A), TO-18 metal can (2N2222A), SOT-23 (MMBT2222A)',
    pinout: 'Fairchild/onsemi PN2222A in TO-92: E, B, C reading left to right with the flat face toward you. NXP numbers it C, B, E. The metal-can 2N2222A (TO-18) has a tab by the emitter.',
    specs: [['Type', 'NPN bipolar'], ['Max Vce', '40 V'], ['Max collector current', '600 mA (NXP, 2N2222A) up to 1 A (Fairchild PN2222A)'], ['Gain (hFE)', '100 to 300 at 150 mA'], ['Power', '625 mW (TO-92)']],
    use: 'A step up from the 2N3904 when you need more drive: small motors, relays, bigger LEDs.', notes: 'Older PN2222 (no A) has a lower voltage rating. Check the pinout for your manufacturer.' });
  add({ id: 'BC547', aliases: ['BC546', 'BC548', 'BC549'], cat: 'Transistor', title: 'NPN general-purpose transistor', pkg: 'TO-92',
    pinout: TO92 + 'C, B, E (collector, base, emitter) on Fairchild/onsemi parts. NXP/Philips datasheets list E, B, C.',
    specs: [['Type', 'NPN bipolar'], ['Max Vce', '45 V (BC546 65 V, BC548 30 V)'], ['Max collector current', '100 mA'], ['Gain (hFE)', '110 to 800 (A, B, C gain groups)'], ['Power', '500 mW']],
    use: 'Small-signal amplifiers, driving LEDs, light sensors, logic interfacing.', notes: 'Pin order differs between makers and from the 2N3904, so verify with the datasheet or a meter before wiring.' });
  add({ id: 'BC557', aliases: ['BC556', 'BC558'], cat: 'Transistor', title: 'PNP general-purpose transistor', pkg: 'TO-92',
    pinout: TO92 + 'C, B, E (Fairchild/onsemi order; NXP lists E, B, C).',
    specs: [['Type', 'PNP bipolar'], ['Max Vce', '−45 V (BC556 −65 V, BC558 −30 V)'], ['Max collector current', '−100 mA'], ['Gain (hFE)', '125 to 800'], ['Power', '500 mW']],
    use: 'PNP partner of the BC547.', notes: '' });
  add({ id: 'BC337', aliases: ['BC338'], cat: 'Transistor', title: 'NPN medium-current transistor', pkg: 'TO-92',
    pinout: TO92 + 'C, B, E (collector, base, emitter).',
    specs: [['Type', 'NPN bipolar'], ['Max Vce', '45 V'], ['Max collector current', '800 mA'], ['Gain (hFE)', '100 to 630'], ['Power', '625 mW']],
    use: 'Driving relays, small motors, and buzzers.', notes: 'PNP partner is the BC327.' });
  add({ id: 'BC327', aliases: ['BC328'], cat: 'Transistor', title: 'PNP medium-current transistor', pkg: 'TO-92',
    pinout: TO92 + 'C, B, E (collector, base, emitter).',
    specs: [['Type', 'PNP bipolar'], ['Max Vce', '−45 V'], ['Max collector current', '−800 mA'], ['Gain (hFE)', '100 to 630'], ['Power', '625 mW']],
    use: 'High-side switching of moderate loads.', notes: 'NPN partner is the BC337.' });
  add({ id: 'S8050', aliases: ['SS8050'], cat: 'Transistor', title: 'NPN low-power transistor', pkg: 'TO-92 (SMD: SOT-23 as J3Y)',
    pinout: 'Varies by maker: some list E, B, C, others C, B, E. Check the datasheet or test with a meter.',
    specs: [['Type', 'NPN bipolar'], ['Max Vce', '25 V'], ['Max collector current', '500 mA'], ['Gain (hFE)', 'about 85 to 350, depending on maker'], ['Power', '625 mW']],
    use: 'Cheap switching and audio output stages. Often paired with the S8550 PNP.', notes: 'Pinout varies between makers, check before wiring.' });
  add({ id: 'S8550', aliases: ['SS8550'], cat: 'Transistor', title: 'PNP low-power transistor', pkg: 'TO-92',
    pinout: 'Varies by maker: some list E, B, C, others C, B, E. Check the datasheet or test with a meter.',
    specs: [['Type', 'PNP bipolar'], ['Max Vce', '−25 V'], ['Max collector current', '−500 mA'], ['Gain (hFE)', 'about 85 to 350, depending on maker'], ['Power', '625 mW']],
    use: 'PNP partner of the S8050.', notes: '' });
  add({ id: 'TIP120', aliases: ['TIP121', 'TIP122'], cat: 'Transistor', title: 'NPN Darlington power transistor', pkg: 'TO-220',
    pinout: 'Front (printed face) toward you, legs down, left to right: B, C, E. The metal tab is connected to the collector.',
    specs: [['Type', 'NPN Darlington'], ['Max Vce', '60 V (TIP121 80 V, TIP122 100 V)'], ['Max collector current', '5 A continuous'], ['Gain (hFE)', '1000 minimum at 3 A'], ['Saturation voltage', '≈2 V at 3 A and 4 V at 5 A, so it gets warm'], ['Power', '65 W with a good heat sink']],
    use: 'Driving motors, solenoids, and lamps straight from a microcontroller pin with a base resistor.', notes: 'The ≈2 V drop wastes power. A logic-level MOSFET wastes far less. PNP partner: TIP125.' });
  add({ id: 'TIP31C', aliases: ['TIP31', 'TIP31A', 'TIP31B'], cat: 'Transistor', title: 'NPN power transistor', pkg: 'TO-220',
    pinout: 'Front toward you, left to right: B, C, E. Tab is the collector.',
    specs: [['Type', 'NPN bipolar'], ['Max Vce', '100 V (31C)'], ['Max collector current', '3 A'], ['Gain (hFE)', 'falls with current: about 25 at 1 A and 10 at 3 A (minimum)'], ['Power', '40 W with heat sink']],
    use: 'Audio output stages, linear regulators, motor and lamp drivers.', notes: 'PNP partner: TIP32C.' });
  add({ id: 'TIP32C', aliases: ['TIP32', 'TIP32A', 'TIP32B'], cat: 'Transistor', title: 'PNP power transistor', pkg: 'TO-220',
    pinout: 'Front toward you, left to right: B, C, E. Tab is the collector.',
    specs: [['Type', 'PNP bipolar'], ['Max Vce', '−100 V (32C)'], ['Max collector current', '−3 A'], ['Gain (hFE)', 'falls with current: about 25 at 1 A and 10 at 3 A (minimum)'], ['Power', '40 W with heat sink']],
    use: 'PNP partner of the TIP31C.', notes: '' });
  add({ id: '2N3055', cat: 'Transistor', title: 'NPN high-power transistor', pkg: 'TO-3 (metal can)',
    pinout: 'Two pins plus the case. Case is the collector. With pins facing you the left pin is the base and the right is the emitter.',
    specs: [['Type', 'NPN bipolar'], ['Max Vce', '60 V'], ['Max collector current', '15 A'], ['Gain (hFE)', '20 to 70 at 4 A'], ['Power', '115 W with a big heat sink']],
    use: 'Classic linear power supplies and amplifiers.', notes: 'Case is live at the collector voltage, so insulate it from the heat sink.' });

  /* ---------- MOSFETs ---------- */
  add({ id: '2N7000', cat: 'MOSFET', title: 'N-channel small-signal MOSFET', pkg: 'TO-92',
    pinout: TO92 + 'S, G, D on most datasheets (Fairchild). onsemi\'s newer datasheet has shown drain and source swapped, so verify before wiring.',
    specs: [['Type', 'N-channel enhancement'], ['Max Vds', '60 V'], ['Max drain current', '200 mA'], ['Rds(on)', '≈5 Ω max at 10 V gate'], ['Gate threshold', '0.8 V min to 3 V max (≈2.1 V typical)'], ['Logic-level?', 'Marginal at 3.3 V, fine at 5 V for light loads']],
    use: 'Switching LEDs, small relays, level shifting (I²C), driving other MOSFETs.', notes: 'The BS170 looks identical but has the pinout reversed (D, G, S). Mixing them up is a classic mistake.' });
  add({ id: 'BS170', cat: 'MOSFET', title: 'N-channel small-signal MOSFET', pkg: 'TO-92',
    pinout: TO92 + 'D, G, S (drain, gate, source) per the onsemi BS170 datasheet, the reverse of the usual 2N7000 order. Some newer datasheets have changed, so verify.',
    specs: [['Type', 'N-channel enhancement'], ['Max Vds', '60 V'], ['Max drain current', '500 mA'], ['Rds(on)', '≈5 Ω max at 10 V gate'], ['Gate threshold', '0.8 to 3 V']],
    use: 'Same jobs as the 2N7000 with a bit more current.', notes: '' });
  add({ id: 'IRF540N', aliases: ['IRF540'], cat: 'MOSFET', title: 'N-channel power MOSFET', pkg: 'TO-220',
    pinout: 'Front (printed face) toward you, legs down, left to right: G, D, S. The metal tab is the drain.',
    specs: [['Type', 'N-channel enhancement'], ['Max Vds', '100 V'], ['Max drain current', '33 A (at 25 °C case)'], ['Rds(on)', '≈44 mΩ at 10 V gate (some listings say 40 mΩ)'], ['Gate threshold', '2 to 4 V'], ['Logic-level?', 'No. Needs about 10 V on the gate for full performance']],
    use: 'Motor, heater, and lamp switching where a gate driver or 10 to 12 V gate supply is available.', notes: 'Do not drive it directly from a 3.3 V or 5 V microcontroller pin for heavy loads. Use a logic-level part like the IRLZ44N.' });
  add({ id: 'IRFZ44N', aliases: ['IRFZ44'], cat: 'MOSFET', title: 'N-channel power MOSFET', pkg: 'TO-220',
    pinout: 'Front toward you, left to right: G, D, S. Tab is the drain.',
    specs: [['Type', 'N-channel enhancement'], ['Max Vds', '55 V'], ['Max drain current', '49 A'], ['Rds(on)', '≈17.5 mΩ at 10 V gate'], ['Gate threshold', '2 to 4 V'], ['Logic-level?', 'No']],
    use: 'Low-voltage, high-current switching such as motor and battery loads.', notes: '' });
  add({ id: 'IRLZ44N', aliases: ['IRLZ44'], cat: 'MOSFET', title: 'N-channel logic-level power MOSFET', pkg: 'TO-220',
    pinout: 'Front toward you, left to right: G, D, S. Tab is the drain.',
    specs: [['Type', 'N-channel enhancement'], ['Max Vds', '55 V'], ['Max drain current', '47 A (older IR datasheets list 41 A)'], ['Rds(on)', '≈22 mΩ at 10 V, 25 mΩ at 5 V, 35 mΩ at 4 V gate'], ['Gate threshold', '1 to 2 V'], ['Logic-level?', 'Yes: well enhanced at 4 to 5 V gate drive']],
    use: 'Switching big loads straight from a 5 V microcontroller.', notes: 'Not quite fully enhanced at 3.3 V. For 3.3 V logic pick a part rated at Vgs 2.5 V.' });
  add({ id: 'IRF520', aliases: ['IRF520N'], cat: 'MOSFET', title: 'N-channel power MOSFET', pkg: 'TO-220',
    pinout: 'Front toward you, left to right: G, D, S. Tab is the drain.',
    specs: [['Type', 'N-channel enhancement'], ['Max Vds', '100 V'], ['Max drain current', '9.2 A'], ['Rds(on)', '≈0.27 Ω at 10 V gate'], ['Gate threshold', '2 to 4 V'], ['Logic-level?', 'No']],
    use: 'Medium-power switching with a 10 V gate drive.', notes: 'The cheap "IRF520 driver modules" run it poorly from 5 V logic. Expect heat.' });
  add({ id: 'IRF9540N', aliases: ['IRF9540'], cat: 'MOSFET', title: 'P-channel power MOSFET', pkg: 'TO-220',
    pinout: 'Front toward you, left to right: G, D, S. Tab is the drain.',
    specs: [['Type', 'P-channel enhancement'], ['Max Vds', '−100 V'], ['Max drain current', '−23 A (IRF9540N)'], ['Rds(on)', '≈117 mΩ at −10 V gate'], ['Gate threshold', '−2 to −4 V']],
    use: 'High-side switching: the source goes to the positive supply and you pull the gate down to turn it on.', notes: '' });
  add({ id: 'FQP30N06L', cat: 'MOSFET', title: 'N-channel logic-level power MOSFET', pkg: 'TO-220',
    pinout: 'Front toward you, left to right: G, D, S. Tab is the drain.',
    specs: [['Type', 'N-channel enhancement'], ['Max Vds', '60 V'], ['Max drain current', '32 A'], ['Rds(on)', '35 mΩ max at 10 V gate (also specified at lower gate drive, see the datasheet)'], ['Logic-level?', 'Yes (5 V)']],
    use: 'Switching motors and lamps from 5 V logic.', notes: 'onsemi lists this part as last shipments, so check availability before using it in a new design.' });
  add({ id: 'AO3400', aliases: ['AO3400A'], cat: 'MOSFET', title: 'N-channel small MOSFET', pkg: 'SOT-23',
    pinout: 'SOT-23: pin 1 gate, pin 2 source, pin 3 drain.',
    specs: [['Type', 'N-channel enhancement'], ['Max Vds', '30 V'], ['Max drain current', '5.7 A'], ['Rds(on)', '≈26 to 32 mΩ at 4.5 to 10 V gate (varies by maker)'], ['Gate threshold', '≈0.65 to 1.45 V'], ['Logic-level?', 'Yes, works from 3.3 V']],
    use: 'Compact load switch for 3.3 V and 5 V projects, battery-powered devices.', notes: '' });
  add({ id: 'AO3401', aliases: ['AO3401A'], cat: 'MOSFET', title: 'P-channel small MOSFET', pkg: 'SOT-23',
    pinout: 'SOT-23: pin 1 gate, pin 2 source, pin 3 drain.',
    specs: [['Type', 'P-channel enhancement'], ['Max Vds', '−30 V'], ['Max drain current', '−4.0 A (AOS datasheet)'], ['Rds(on)', 'under 50 mΩ at −10 V and under 60 mΩ at −4.5 V (AOS datasheet)'], ['Gate threshold', '−0.5 V min to −1.3 V max'], ['Logic-level?', 'Yes']],
    use: 'High-side load switch and reverse-polarity protection.', notes: 'Check exact numbers for your supplier in the datasheet.' });

  /* ---------- Regulators ---------- */
  [['05', 5], ['06', 6], ['08', 8], ['09', 9], ['12', 12], ['15', 15], ['18', 18], ['24', 24]].forEach(function (r) {
    add({ id: '78' + r[0], aliases: ['LM78' + r[0], 'L78' + r[0], 'UA78' + r[0], 'MC78' + r[0]], cat: 'Regulator', title: '+' + r[1] + ' V linear regulator, 1 A', pkg: 'TO-220 (also TO-252/D-PAK, TO-263)',
      pinout: 'Front toward you, left to right: 1 IN, 2 GND, 3 OUT. The metal tab is connected to GND.',
      specs: [['Output', '+' + r[1] + ' V fixed'], ['Max output current', '1 A (needs a heat sink)'], ['Dropout voltage', '≈2 V at 1 A, so the input must stay at least about 2 V above the output (the datasheet gives the exact minimum)'], ['Max input voltage', r[1] === 24 ? '40 V' : '35 V'], ['Heat', 'Dissipates (Vin − Vout) × current as heat']],
      use: 'Classic fixed-voltage supply from a battery or wall adapter. Add 0.33 µF on the input and 0.1 µF on the output.', notes: 'A 12 V input to a 7805 at 500 mA burns about 3.5 W as heat. For big drops consider a buck converter.' });
  });
  [['05', 5], ['12', 12]].forEach(function (r) {
    add({ id: '79' + r[0], aliases: ['LM79' + r[0], 'L79' + r[0]], cat: 'Regulator', title: '−' + r[1] + ' V linear regulator, 1 A', pkg: 'TO-220',
      pinout: 'Front toward you, left to right: 1 GND, 2 IN, 3 OUT. Pin order differs from the 78xx series.',
      specs: [['Output', '−' + r[1] + ' V fixed'], ['Max output current', '1 A'], ['Dropout voltage', '≈2 V']],
      use: 'The negative rail of a dual-supply (±) power supply for op-amps and audio.', notes: '' });
  });
  add({ id: '78L05', aliases: ['LM78L05', 'L78L05'], cat: 'Regulator', title: '+5 V linear regulator, 100 mA', pkg: 'TO-92 (also SOIC-8)',
    pinout: TO92 + 'OUT, GND, IN per ST and TI. Some makers differ, so check the datasheet.',
    specs: [['Output', '+5 V fixed'], ['Max output current', '100 mA'], ['Dropout voltage', '≈1.7 to 2 V'], ['Input voltage', 'about 7 to 20 V in use, 30 V absolute max']],
    use: 'Small low-current rails and sensors.', notes: 'Pin order is not the same as the TO-220 7805.' });
  add({ id: 'LM317', aliases: ['LM317T'], cat: 'Regulator', title: 'Adjustable linear regulator, 1.5 A', pkg: 'TO-220 (also TO-263, SOT-223)',
    pinout: 'Front toward you, left to right: 1 ADJ, 2 OUT, 3 IN. The tab is connected to OUT.',
    specs: [['Output', '1.25 V to 37 V, set by two resistors'], ['Max output current', '1.5 A'], ['Dropout voltage', 'needs roughly 2 to 3 V between input and output'], ['Formula', 'Vout ≈ 1.25 × (1 + R2 / R1)'], ['Max input-output difference', '40 V']],
    use: 'Adjustable bench supplies, battery chargers, and constant-current sources.', notes: 'R1 (OUT to ADJ) is usually 240 Ω. R2 (ADJ to ground) sets the voltage.' });
  add({ id: 'AMS1117-3.3', aliases: ['AMS1117', 'AMS1117-3V3', 'AMS1117-5.0', 'LD1117', 'LD1117-3.3'], cat: 'Regulator', title: '+3.3 V low-dropout regulator, 1 A', pkg: 'SOT-223',
    pinout: 'SOT-223 facing you: 1 GND, 2 OUT, 3 IN. The large tab is also OUT. This is the AMS1117 and LM1117 convention, but confirm with your maker.',
    specs: [['Output', '+3.3 V fixed (also sold as 5 V, 1.8 V, and adjustable)'], ['Max output current', '1 A'], ['Dropout voltage', '≈1.2 to 1.3 V at 1 A (varies by maker)'], ['Max input voltage', 'varies by maker (12 to 15 V is common, some list more), so stay well below it'], ['Output capacitor', 'at least 10 µF tantalum recommended']],
    use: 'Powering 3.3 V microcontrollers (ESP8266, ESP32, Pro Mini boards) from 5 V.', notes: 'Very common on cheap dev boards. Without a proper output capacitor it can oscillate.' });
  add({ id: 'LM1117-3.3', aliases: ['LM1117', 'LM1117-5.0'], cat: 'Regulator', title: '+3.3 V low-dropout regulator, 800 mA', pkg: 'SOT-223 (also TO-220, TO-252)',
    pinout: 'SOT-223: 1 GND, 2 OUT, 3 IN. Tab is OUT.',
    specs: [['Output', '+3.3 V fixed (other versions: 1.8, 2.5, 5, adjustable)'], ['Max output current', '800 mA'], ['Dropout voltage', '1.2 V typical, 1.3 V max at 800 mA'], ['Max input voltage', 'about 20 V for most versions (check the datasheet)']],
    use: 'The original source of the AMS1117-type pinout.', notes: '' });
  add({ id: 'MCP1700-3302', aliases: ['MCP1700'], cat: 'Regulator', title: '+3.3 V ultra-low-quiescent LDO, 250 mA', pkg: 'SOT-23, SOT-89, TO-92',
    pinout: 'Pin order differs per package (SOT-23A, SOT-89, TO-92), so check the datasheet before wiring.',
    specs: [['Output', '+3.3 V'], ['Max output current', '250 mA (200 mA for outputs below 2.5 V)'], ['Dropout voltage', '≈0.18 V at 250 mA (2.8 V version)'], ['Quiescent current', '≈1.6 µA'], ['Input range', '2.3 to 6 V']],
    use: 'Battery-powered projects that sleep most of the time.', notes: '' });
  add({ id: 'TL431', cat: 'Regulator', title: 'Adjustable shunt voltage reference', pkg: 'TO-92, SOT-23, SOIC-8',
    pinout: 'TO-92, flat face toward you: REF, ANODE, CATHODE (varies by package, check the datasheet).',
    specs: [['Reference voltage', '2.495 V'], ['Output range', '2.5 V to 36 V with two resistors'], ['Cathode current', 'about 1 to 100 mA (the minimum varies by maker, 0.4 to 1 mA)'], ['Formula', 'Vout ≈ 2.5 × (1 + R1 / R2)']],
    use: 'Precision references, voltage monitors, feedback in switching power supplies.', notes: '' });
  add({ id: 'LM2596', cat: 'Regulator', title: 'Step-down (buck) switching regulator, 3 A', pkg: 'TO-220-5 / TO-263-5',
    pinout: '5 pins: 1 VIN, 2 OUT, 3 GND, 4 FEEDBACK, 5 ON/OFF (confirm in the datasheet for your package).',
    specs: [['Output', '3.3 V, 5 V, 12 V fixed, or 1.23 V to 37 V adjustable'], ['Max output current', '3 A'], ['Input range', '4.5 V to 40 V'], ['Switching frequency', '150 kHz'], ['Efficiency', '≈75 to 90%']],
    use: 'Efficient step-down supply. Needs an inductor, a Schottky diode (such as an SS34), and capacitors. Common on cheap ready-made buck modules.', notes: '' });

  /* ---------- ICs ---------- */
  add({ id: 'NE555', aliases: ['555', 'LM555', 'NE555P', 'TLC555', 'LMC555'], cat: 'IC', title: 'Timer IC', pkg: 'DIP-8, SOIC-8',
    pinout: 'Pin 1 GND, 2 TRIG, 3 OUT, 4 RESET, 5 CTRL, 6 THRES, 7 DISCH, 8 VCC. Pin 1 is next to the notch or dot.',
    specs: [['Supply', '4.5 to 16 V (ST datasheet); 5 to 15 V is the usual spec and 18 V is the absolute max. CMOS versions like the TLC555 run from about 2 V'], ['Output current', '≈200 mA source or sink'], ['Astable frequency', 'f ≈ 1.44 / ((R1 + 2 × R2) × C)'], ['Monostable time', 'T ≈ 1.1 × R × C']],
    use: 'Blinkers, one-shot timers, PWM, simple tone generators.', notes: '' });
  add({ id: 'LM358', aliases: ['LM358N', 'LM2904'], cat: 'IC', title: 'Dual op-amp, single-supply', pkg: 'DIP-8, SOIC-8',
    pinout: '1 OUT1, 2 IN1−, 3 IN1+, 4 GND (V−), 5 IN2+, 6 IN2−, 7 OUT2, 8 V+.',
    specs: [['Supply', '3 to 32 V single (or ±1.5 to ±16 V)'], ['Channels', '2 op-amps'], ['Input range', 'Includes ground'], ['Output swing', 'Reaches ≈ V+ − 1.5 V at the top, close to ground at the bottom']],
    use: 'Sensor amplifiers, buffering, comparators in low-speed circuits, single-supply designs.', notes: 'Not rail-to-rail on the output. Quad version: LM324.' });
  add({ id: 'LM393', aliases: ['LM339'], cat: 'IC', title: 'Dual comparator, open-collector output', pkg: 'DIP-8, SOIC-8',
    pinout: '1 OUT1, 2 IN1−, 3 IN1+, 4 GND, 5 IN2+, 6 IN2−, 7 OUT2, 8 VCC.',
    specs: [['Supply', '2 to 36 V (onsemi); some makers specify 3 to 32 V'], ['Output', 'Open collector, needs a pull-up resistor'], ['Channels', '2 comparators']],
    use: 'Threshold detection, sensor modules, zero-crossing detection.', notes: 'LM339 is the quad version.' });
  add({ id: 'TL072', aliases: ['TL071', 'TL074'], cat: 'IC', title: 'Dual low-noise JFET op-amp', pkg: 'DIP-8, SOIC-8',
    pinout: 'Same as LM358: 1 OUT1, 2 IN1−, 3 IN1+, 4 V−, 5 IN2+, 6 IN2−, 7 OUT2, 8 V+.',
    specs: [['Supply', 'up to ±18 V absolute max; ±5 to ±15 V is the usual range'], ['Input', 'JFET, very high impedance'], ['Noise', 'Low, popular for audio']],
    use: 'Audio preamps, filters, guitar effects.', notes: 'Needs more than about 7 V total supply, so it is not a 3.3 V part.' });
  add({ id: 'LM386', aliases: ['LM386N-1', 'LM386N'], cat: 'IC', title: 'Low-voltage audio power amplifier', pkg: 'DIP-8',
    pinout: '1 GAIN, 2 IN−, 3 IN+, 4 GND, 5 OUT, 6 V+, 7 BYPASS, 8 GAIN.',
    specs: [['Supply', '4 to 12 V (N-1, N-3), 5 to 18 V (N-4)'], ['Output power', '≈325 mW (LM386N-1), 500 mW (N-3), up to about 1 W (N-4), typical'], ['Gain', '20 by default, up to 200 with a capacitor across pins 1 and 8']],
    use: 'Small speaker amplifiers and radios.', notes: '' });
  add({ id: 'ATMEGA328P', aliases: ['ATMEGA328', 'ATMEGA328P-PU', 'ATMEGA328P-AU'], cat: 'IC', title: '8-bit AVR microcontroller (Arduino Uno / Nano)', pkg: 'DIP-28, TQFP-32',
    pinout: 'Pin 1 is next to the notch. Pin 7 VCC, 8 GND, 20 AVCC, 21 AREF, 22 GND (DIP-28).',
    specs: [['Flash / SRAM / EEPROM', '32 KB / 2 KB / 1 KB'], ['Clock', 'Up to 20 MHz (16 MHz on Uno)'], ['Supply', '1.8 to 5.5 V (full speed needs ≈4.5 V)'], ['I/O pins', '23 (DIP-28)'], ['Pin current', '40 mA absolute max. 20 mA is the common recommended limit (a board-vendor convention, not a Microchip spec)']],
    use: 'The heart of the Arduino Uno and Nano. Runs standalone with a crystal and a few capacitors.', notes: '' });
  add({ id: '74HC595', aliases: ['SN74HC595', '74HC595N'], cat: 'IC', title: '8-bit shift register with output latch', pkg: 'DIP-16, SOIC-16',
    pinout: 'Q1–Q7 on pins 1–7, 8 GND, 9 Q7′ (cascade out), 10 SRCLR, 11 SRCLK (shift clock), 12 RCLK (latch), 13 OE (active low), 14 SER (data in), 15 Q0, 16 VCC.',
    specs: [['Supply', '2 to 6 V'], ['Outputs', '8, push-pull'], ['Drive', 'About 6 mA per pin keeps the logic levels in spec (check the datasheet); 35 mA absolute max'], ['Cascade', 'Chain several by joining Q7′ to the next SER']],
    use: 'Turns three microcontroller pins into 8 or more outputs for LEDs, 7-segment displays, and relays (via drivers).', notes: '' });
  add({ id: 'L293D', cat: 'IC', title: 'Dual H-bridge motor driver', pkg: 'DIP-16',
    pinout: 'Pin 1 EN1, 2 IN1, 3 OUT1, 4/5 GND, 6 OUT2, 7 IN2, 8 VCC2 (motor), 9 EN2, 10 IN3, 11 OUT3, 12/13 GND, 14 OUT4, 15 IN4, 16 VCC1 (logic).',
    specs: [['Motor supply (VCC2)', '4.5 to 36 V'], ['Logic supply (VCC1)', '5 V'], ['Output current', '600 mA continuous per channel (1.2 A peak)'], ['Protection', 'Built-in flyback diodes']],
    use: 'Driving two small DC motors or one stepper in both directions.', notes: 'Its bipolar outputs drop a noticeable voltage (see the datasheet), so motors see less than the supply.' });
  add({ id: 'ULN2003', aliases: ['ULN2003A', 'ULN2803'], cat: 'IC', title: '7-channel Darlington transistor array', pkg: 'DIP-16, SOIC-16',
    pinout: 'Pins 1–7 inputs, 8 GND, 9 COM (flyback diodes), 10–16 outputs (opposite their inputs).',
    specs: [['Channels', '7 (ULN2803 has 8)'], ['Output', '500 mA per channel, 50 V, sinks current to ground'], ['Inputs', 'Work from 5 V logic']],
    use: 'Driving relays, solenoids, stepper motors (28BYJ-48), and LED strips from a microcontroller.', notes: 'Connect COM (pin 9) to the load supply positive when driving inductive loads.' });


  /* ---------- extra SMD parts ---------- */
  add({ id: 'BAS16', aliases: ['BAS16W'], cat: 'Diode', title: 'Small-signal switching diode (SMD 1N4148 equivalent)', pkg: 'SOT-23',
    polarity: 'Pin 1 anode, pin 3 cathode (pin 2 not connected).',
    specs: [['Forward drop', '1.25 V max at 150 mA'], ['Max reverse voltage', '75 V continuous (see the datasheet for the repetitive peak rating)'], ['Max forward current', '215 mA'], ['Recovery time', '≈4 ns']],
    use: 'The surface-mount counterpart to the 1N4148 for logic steering and signal clipping.', notes: '' });
  add({ id: 'M7', aliases: ['1N4007 SMD'], cat: 'Diode', title: 'SMD rectifier diode, 1 A, 1000 V (same ratings as a 1N4007)', pkg: 'SMA (DO-214AC)',
    polarity: 'Cathode is the end with the stripe on the top of the body.',
    specs: [['Forward drop', '≈1.1 V at 1 A'], ['Max reverse voltage', '1000 V'], ['Max forward current', '1 A average'], ['Recovery time', 'Slow, mains frequency only']],
    use: 'Mains rectification and reverse-polarity protection on SMD boards.', notes: 'M1 to M7 mirror the 1N4001 to 1N4007 voltages. The printed M7 is the part marking.' });
  add({ id: 'BC847', aliases: ['BC847B', 'BC847A', 'BC847C', 'BC846', 'BC848'], cat: 'Transistor', title: 'NPN general-purpose transistor (SMD BC547)', pkg: 'SOT-23',
    pinout: 'SOT-23 with the single pin at the top: pin 1 base, pin 2 emitter, pin 3 collector.',
    specs: [['Type', 'NPN bipolar'], ['Max Vce', '45 V (BC846 65 V, BC848 30 V)'], ['Max collector current', '100 mA'], ['Gain (hFE)', 'A 110 to 220, B 200 to 450, C 420 to 800'], ['Power', '250 mW']],
    use: 'Surface-mount small-signal switching and amplifying.', notes: '' });
  add({ id: 'BC857', aliases: ['BC857B', 'BC857A', 'BC857C', 'BC856', 'BC858'], cat: 'Transistor', title: 'PNP general-purpose transistor (SMD BC557)', pkg: 'SOT-23',
    pinout: 'SOT-23 with the single pin at the top: pin 1 base, pin 2 emitter, pin 3 collector.',
    specs: [['Type', 'PNP bipolar'], ['Max Vce', '−45 V'], ['Max collector current', '−100 mA'], ['Gain (hFE)', 'A 125 to 250, B 220 to 475, C 420 to 800'], ['Power', '250 mW']],
    use: 'PNP partner of the BC847.', notes: '' });

  /* SMD top-marking codes (manufacturer dependent; many makers add a letter prefix or date code) */
  var MARKS = { 'BAT54': ['L4', 'KL1', 'L42 (A)', 'L43 (C)', 'L44 (S)'], 'BAV99': ['A7'], 'BAS16': ['A6'], 'M7': ['M7'],
    '2N3904': ['1AM'], '2N3906': ['2A'], 'PN2222A': ['1P'], 'BC847': ['1E', '1F', '1G'], 'BC857': ['3E', '3F', '3G'], 'AO3400': ['A09T'], 'AO3401': ['A19T'], '1N4148': ['T4'] };
  P.forEach(function (p) { if (MARKS[p.id] && MARKS[p.id].length) p.marks = MARKS[p.id]; });

  var api = { PARTS: P };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PartsData = api;
})(this);
