const test = require('node:test');
const assert = require('node:assert');
const P = require('../../../www/tools/pcb/js/pcb-logic.js');
const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, a + ' vs ' + b);

test('trace width', () => {
  let r = P.traceWidth({ I: 2, oz: 1, dT: 10, layer: 'ext' }); near(r.wMil, 30.74, 0.3); near(r.wMm, 0.781, 0.01); near(r.thickUm, 35, 1e-9);
  const i = P.traceWidth({ I: 2, oz: 1, dT: 10, layer: 'int' }); assert.ok(i.wMil > r.wMil * 2);
  const two = P.traceWidth({ I: 2, oz: 2, dT: 10, layer: 'ext' }); near(two.wMil, r.wMil / 2, 1e-9);
  assert.ok(P.traceWidth({ I: 0, oz: 1, dT: 10 }).error);
  // round trip: the width should carry the current back
  near(0.048 * Math.pow(10, 0.44) * Math.pow(r.areaMil2, 0.725), 2, 1e-9);
});
test('trace resistance', () => {
  const r = P.traceResistance({ len: 100, w: 0.5, oz: 1, I: 2 }); near(r.R20, 0.0985, 0.001); near(r.drop, 2 * r.R, 1e-12); near(r.P, 4 * r.R, 1e-12);
  const hot = P.traceResistance({ len: 100, w: 0.5, oz: 1, T: 100 }); near(hot.R / hot.R20, 1 + 0.00393 * 80, 1e-9);
});
test('via', () => {
  const r = P.via({ drill: 0.3, plate: 25, dT: 10, len: 1.6 }); near(r.I, 0.843, 0.01); assert.ok(r.R > 0 && r.R < 0.01);
  assert.ok(P.via({ drill: 0.05, plate: 30, dT: 10 }).error);
});
test('spacing', () => {
  assert.equal(P.spacing({ V: 12, kind: 'int' }).mm, 0.05); assert.equal(P.spacing({ V: 24, kind: 'ext' }).mm, 0.1); assert.equal(P.spacing({ V: 100, kind: 'ext' }).mm, 0.6);
  assert.equal(P.spacing({ V: 400, kind: 'coated' }).mm, 0.8); assert.ok(P.spacing({ V: 600, kind: 'ext' }).error);
});
test('awg and metric', () => {
  const a = P.awgToMetric(22); near(a.d, 0.6438, 1e-3); near(a.area, 0.3255, 1e-3); near(a.perM, 0.05296, 1e-4);
  const m = P.metricToAwg(a.area); near(m.awg, 22, 1e-6); assert.equal(m.nearest, 22);
  assert.ok(P.awgToMetric(50).error);
  near(P.wire({ awg: 22, len: 10, unit: 'm', I: 2, round: true, Vs: 12 }).drop, 0.05296 * 20 * 2, 0.01);
});
