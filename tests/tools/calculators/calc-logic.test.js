const test = require('node:test');
const assert = require('node:assert');
const C = require('../../../www/tools/calculators/js/calc-logic.js');
const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, a + ' vs ' + b);

test('series sizes', () => {
  assert.equal(C.E96.length, 96); assert.equal(C.E48.length, 48); assert.equal(C.E24.length, 24);
  assert.equal(C.E12.length, 12); assert.equal(C.E6.length, 6);
  assert.deepEqual(C.E48.slice(0, 4), [1.00, 1.10, 1.21, 1.33].map((_, i) => C.E96[i * 2]));
});
test('nearest', () => {
  assert.equal(C.nearest('E24', 150, 'up'), 150);
  assert.equal(C.nearest('E24', 151, 'up'), 160);
  assert.equal(C.nearest('E12', 4600, 'down'), 3900);
  assert.equal(C.nearest('E24', 3290, 'nearest'), 3300);
});
test('fmt', () => {
  assert.equal(C.fmt(0.0047, 'A'), '4.7 mA');
  assert.equal(C.fmt(15100, 'Ω'), '15.1 kΩ');
  assert.equal(C.fmt(999.7, 'Ω'), '1 kΩ');
  assert.equal(C.fmt(2.2e-6, 'F'), '2.2 µF');
  assert.equal(C.fmt(0, 'V'), '0 V');
});
test('parse', () => {
  assert.equal(C.parse('4k7'), 4700); assert.equal(C.parse('4.7k'), 4700); assert.equal(C.parse('10u'), 1e-5);
  assert.equal(C.parse('2.2 uF'), 2.2e-6); assert.equal(C.parse('1Meg'), 1e6); assert.equal(C.parse('330 Ω'), 330);
  assert.equal(C.parse('5V'), 5); assert.ok(isNaN(C.parse(''))); assert.ok(isNaN(C.parse('abc')));
});
test('ohm', () => {
  let r = C.ohm({ V: 12, I: 0.02, R: NaN, P: NaN });
  near(r.R, 600, 1e-9); near(r.P, 0.24, 1e-12); assert.equal(r.rec.label, '1/2 W');
  r = C.ohm({ V: NaN, I: NaN, R: 100, P: 1 });
  near(r.V, 10, 1e-9); near(r.I, 0.1, 1e-12);
  r = C.ohm({ V: NaN, I: 0.5, R: NaN, P: 10 }); near(r.V, 20, 1e-9); near(r.R, 40, 1e-9);
  assert.ok(C.ohm({ V: 1, I: NaN, R: NaN, P: NaN }).error);
  assert.ok(C.ohm({ V: 1, I: 1, R: 1, P: NaN }).error);
});
test('led', () => {
  let r = C.led({ Vs: 5, Vf: 2, If: 0.02, n: 1, mode: 'series', series: 'E24' });
  near(r.R, 150, 1e-9); assert.equal(r.Rstd, 150);
  r = C.led({ Vs: 5, Vf: 2, If: 0.015, n: 1, mode: 'series', series: 'E24' });
  near(r.R, 200, 1e-9); assert.equal(r.Rstd, 200);
  r = C.led({ Vs: 5, Vf: 2, If: 0.0175, n: 1, mode: 'series', series: 'E24' }); assert.equal(r.Rstd, 180); assert.ok(r.Iact <= 0.0175);
  r = C.led({ Vs: 5, Vf: 2, If: 0.02, n: 3, mode: 'series', series: 'E24' }); assert.ok(r.error);
  r = C.led({ Vs: 5, Vf: 2, If: 0.02, n: 3, mode: 'parallel', series: 'E24' }); near(r.totalI, 0.06, 1e-9); assert.equal(r.resistors, 3);
});
test('divider', () => {
  const s = C.dividerStats(5, 5100, 10000, NaN);
  near(s.Vout, 3.3113, 1e-3); near(s.I, 5 / 15100, 1e-12); near(s.Zout, 5100 * 10000 / 15100, 1e-6);
  const r = C.divider({ Vin: 5, Vout: 3.3, series: 'E24', Rmin: 1000, Rmax: 100000, Rload: 10000 });
  assert.ok(Math.abs(r.best.errPct) < 0.5);
  for (let i = 1; i < r.list.length; i++) assert.ok(Math.abs(r.list[i].errPct) + 1e-9 >= Math.abs(r.list[i - 1].errPct));
  assert.ok(r.best.VoutLoaded < r.best.Vout);
  assert.ok(C.divider({ Vin: 3, Vout: 5, series: 'E24' }).error);
});
test('series/parallel and combos', () => {
  near(C.sumList([1500, 1800]), 3300, 1e-9); near(C.recipList([4700, 11000]), 3293.0, 1);
  let r = C.findCombo({ target: 3300, series: 'E12' }); assert.equal(r.list[0].value, 3300); assert.equal(r.list[0].parts, 1);
  r = C.findCombo({ target: 3290, series: 'E6' }); assert.ok(r.list.length > 0); assert.ok(r.list.some(x => x.parts === 2));
  assert.ok(Math.abs(C.findCombo({ target: 7777, series: 'E24' }).list[0].errPct) < 1);
});
test('rc, reactance, 555, 317', () => {
  const r = C.rc({ R: 10000, C: 1e-6 }); near(r.tau, 0.01, 1e-12); near(r.fc, 15.915, 1e-3);
  const x = C.reactance({ L: 1e-3, C: 1e-6, f: 1000 }); near(x.f0, 5032.9, 0.1); near(x.XL, 6.2832, 1e-3); near(x.XC, 159.15, 0.01);
  const a = C.timer555({ mode: 'astable', R1: 1000, R2: 10000, C: 1e-6 }); near(a.th, 0.007623, 1e-9); near(a.tl, 0.00693, 1e-9); near(a.duty, 52.38, 0.01);
  near(C.timer555({ mode: 'mono', R1: 10000, C: 1e-5 }).T, 0.11, 1e-9);
  near(C.lm317({ mode: 'calc', R1: 240, R2: 720 }).Vout, 5.036, 1e-3);
  const s = C.lm317({ mode: 'solve', R1: 240, Vout: 9 }); near(s.Vout, 9, 0.2);
});
test('wire, i2c, battery, bjt', () => {
  near(C.awgDiameterMm(22), 0.6438, 1e-3);
  const w = C.wire({ awg: 22, len: 1, unit: 'm', I: 1, round: false }); near(w.perM, 0.05296, 1e-4);
  near(C.wire({ awg: 22, len: 10, unit: 'm', I: 2, round: true, Vs: 12 }).drop, 0.05296 * 20 * 2, 0.01);
  const i = C.i2c({ mode: 'fast', Vdd: 3.3, Cb: 100e-12 }); near(i.rmax, 3540.5, 1); near(i.rmin, 966.7, 0.1); assert.ok(i.pick >= i.rmin && i.pick <= i.rmax);
  assert.equal(C.i2c({ mode: 'fast', Vdd: 3.3, Cb: 400e-12 }).pick, undefined);
  near(C.battery({ cap: 2000, active: 100, sleep: 0, duty: 100, usable: 80 }).hours, 16, 1e-9);
  near(C.battery({ cap: 1000, active: 50, sleep: 0.01, duty: 1, usable: 100 }).avg, 50 * 0.01 + 0.01 * 0.99, 1e-9);
  const b = C.bjtSwitch({ Ic: 0.1, Vdrive: 5, Vbe: 0.7, beta: 10, hfe: 100 }); near(b.Rb, 430, 1e-6); assert.equal(b.Rstd, 430); assert.ok(b.hfeOk);
});

test('rc reverse, lm317 cc', () => {
  let r = C.rcReverse({ fc: 1000, R: 10000, C: NaN, series: 'E12' });
  assert.equal(r.solve, 'C'); near(r.exact, 1 / (2 * Math.PI * 10000 * 1000), 1e-12); assert.equal(r.std, 1.5e-8);
  r = C.rcReverse({ fc: 1000, R: NaN, C: 1e-7, series: 'E24' }); assert.equal(r.solve, 'R'); assert.ok(Math.abs(r.errPct) < 3);
  assert.ok(C.rcReverse({ fc: 1000, R: 1, C: 1 }).error);
  const c = C.lm317cc({ I: 0.02 }); near(c.R, 62.5, 1e-9); assert.equal(c.Rstd, 61.9); near(c.Iact, 1.25 / 61.9, 1e-9);
});
test('mosfet, opamp', () => {
  const m = C.mosfet({ Id: 10, Vdrive: 5, Rds: 0.02, Vth: 2, Qg: 30e-9, f: 20000, Ipk: 0.02 });
  near(m.P, 2, 1e-9); near(m.drop, 0.2, 1e-9); assert.ok(m.vthOk); near(m.Igate, 6e-4, 1e-9); assert.equal(m.RgStd, 270);
  let o = C.opamp({ mode: 'inv', Rf: 10000, Rin: 1000, V1: 0.5 }); near(o.gain, -10, 1e-9); near(o.Vout, -5, 1e-9);
  o = C.opamp({ mode: 'non', Rf: 9000, Rin: 1000, V1: 1 }); near(o.gain, 10, 1e-9);
  o = C.opamp({ mode: 'non', Rf: 10000, G: 11, Rin: NaN, series: 'E24' }); near(o.RinExact, 1000, 1e-9); assert.equal(o.Rin, 1000);
  o = C.opamp({ mode: 'sum', Rf: 10000, Rin: 10000, R2: 10000, V1: 1, V2: 2 }); near(o.Vout, -3, 1e-9);
  o = C.opamp({ mode: 'diff', Rf: 20000, Rin: 10000, V1: 1, V2: 1.5 }); near(o.Vout, 1, 1e-9);
});
test('zener, tolerance, shunt', () => {
  const z = C.zener({ Vin: 12, Vz: 5.1, Iload: 0.02, Iz: 0.005 }); near(z.R, 6.9 / 0.025, 1e-6); assert.equal(z.Rstd, 270); assert.ok(z.Iz >= 0.005);
  const t = C.tolerance({ Vin: 5, R1: 10000, R2: 10000, tol: 1 }); near(t.nom, 2.5, 1e-9); near(t.max, 5 * 10100 / 20000, 1e-9); assert.ok(t.min < 2.5);
  const s = C.shunt({ I: 5, Vs: 0.1, Vfs: 3.3 }); near(s.R, 0.02, 1e-12); assert.equal(s.Rstd, 0.02); near(s.P, 0.5, 1e-9); near(s.gain, 33, 1e-9);
});
test('ntc, decibels', () => {
  near(C.ntc({ mode: 'R2T', R: 10000, R0: 10000, T0: 25, B: 3950 }).T, 25, 1e-9);
  near(C.ntc({ mode: 'T2R', T: 50, R0: 10000, T0: 25, B: 3950 }).R, 3588, 20);
  near(C.ntc({ mode: 'R2T', R: C.ntc({ mode: 'T2R', T: 40, R0: 10000, T0: 25, B: 3950 }).R, R0: 10000, T0: 25, B: 3950 }).T, 40, 1e-9);
  near(C.decibels({ mode: 'v2db', value: 2 }).out, 6.0206, 1e-3); near(C.decibels({ mode: 'p2db', value: 2 }).out, 3.0103, 1e-3);
  near(C.decibels({ mode: 'dbm2w', value: 30 }).out, 1, 1e-9); near(C.decibels({ mode: 'w2dbm', value: 0.001 }).out, 0, 1e-9);
  near(C.decibels({ mode: 'db2v', value: 20 }).out, 10, 1e-9);
});
test('RLC Q', () => {
  const r = C.reactance({ L: 1e-3, C: 1e-6, R: 10 }); near(r.Qseries, Math.sqrt(1000) / 10, 1e-9); near(r.BWseries, r.f0 / r.Qseries, 1e-6);
  near(r.Qparallel, 10 * Math.sqrt(1e-3), 1e-9);
});
