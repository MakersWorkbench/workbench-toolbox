const test = require('node:test');
const assert = require('node:assert');
const P = require('../../../www/tools/power/js/power-logic.js');
const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, a + ' vs ' + b);

test('linear regulator', () => {
  let r = P.linearReg({ Vin: 12, Vout: 5, I: 0.5, Iq: 0.005, thJA: 65, Ta: 25, TjMax: 125, thJC: 5, thCS: 1 });
  near(r.P, 3.5 + 12 * 0.005, 1e-9); assert.equal(r.verdict, 'sink'); assert.ok(r.thSA > 0); near(r.PmaxNoSink, 100 / 65, 1e-9);
  near(r.thTotal, 100 / r.P, 1e-9); near(r.thSA, r.thTotal - 6, 1e-9); assert.ok(r.eff < 42);
  r = P.linearReg({ Vin: 6, Vout: 5, I: 0.1, thJA: 65, Ta: 25, TjMax: 125 }); assert.equal(r.verdict, 'ok'); assert.ok(r.Tj < 125);
  r = P.linearReg({ Vin: 24, Vout: 5, I: 1.5, thJA: 65, Ta: 25, TjMax: 125, thJC: 5, thCS: 1 }); assert.ok(r.impossible === false || r.impossible === true);
  assert.ok(P.linearReg({ Vin: 5, Vout: 12, I: 1, thJA: 65 }).error);
});
test('capacitor discharge', () => {
  let r = P.capDischarge({ mode: 'time', C: 470e-6, V0: 400, V: 50, R: 100000 }); near(r.t, 100000 * 470e-6 * Math.log(8), 1e-6); near(r.energy, 0.5 * 470e-6 * 160000, 1e-9); near(r.P0, 1.6, 1e-9);
  r = P.capDischarge({ mode: 'bleeder', C: 470e-6, V0: 400, V: 50, t: 60 }); near(r.R, 60 / (470e-6 * Math.log(8)), 1e-6); assert.ok(r.tActual <= 60 + 1e-9); assert.ok(r.Rstd <= r.R);
  assert.ok(P.capDischarge({ mode: 'time', C: 1e-6, V0: 10, V: 20, R: 1 }).error);
});
test('battery pack', () => {
  const r = P.batteryPack({ chem: 'liion', cap: 2500, s: 3, p: 2, crate: 2 });
  near(r.nom, 11.1, 1e-9); near(r.max, 12.6, 1e-9); near(r.min, 9, 1e-9); assert.equal(r.capMah, 5000); near(r.energy, 55.5, 1e-9); near(r.maxI, 10, 1e-9); assert.equal(r.cells, 6);
  assert.ok(P.batteryPack({ chem: 'nope', cap: 1, s: 1, p: 1 }).error);
});
test('battery life advanced', () => {
  let r = P.batteryLifeAdv({ cap: 2500, usable: 80, Ia: 120, ta: 5, Is: 0.02, ts: 55, reg: 'switch', Vbat: 3.7, Vout: 3.3, eff: 90 });
  near(r.avgLoad, (120 * 5 + 0.02 * 55) / 60, 1e-9); near(r.Ibat, r.avgLoad * 3.3 / (3.7 * 0.9), 1e-9); near(r.hours, 2000 / r.Ibat, 1e-6);
  r = P.batteryLifeAdv({ cap: 1000, usable: 100, Ia: 100, ta: 1, Is: 0, ts: 0, reg: 'none' }); near(r.hours, 10, 1e-9);
  r = P.batteryLifeAdv({ cap: 1000, usable: 100, Ia: 100, ta: 1, Is: 0, ts: 0, reg: 'linear', Iq: 5 }); near(r.hours, 1000 / 105, 1e-9);
  assert.ok(P.batteryLifeAdv({ cap: 1000, usable: 100, Ia: 1, ta: 1, reg: 'switch', Vbat: 3.7, Vout: 3.3, eff: 150 }).error);
});
test('ripple', () => {
  let r = P.ripple({ I: 0.5, f: 120, dV: 1 }); near(r.C, 0.5 / 120, 1e-12); assert.equal(r.Cstd, 0.0047); assert.ok(r.dVStd <= 1);
  r = P.ripple({ I: 0.5, f: 100, C: 4.7e-3 }); near(r.dV, 0.5 / (100 * 4.7e-3), 1e-12);
  assert.ok(P.ripple({ I: 0.5, f: 100 }).error);
});
