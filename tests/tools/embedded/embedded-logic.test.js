const test = require('node:test');
const assert = require('node:assert');
const E = require('../../../www/tools/embedded/js/embedded-logic.js');
const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, a + ' vs ' + b);

test('adc', () => {
  let r = E.adc({ bits: 10, vref: 5, value: 512, mode: 'c2v', convention: 'pow' }); near(r.out, 2.5, 1e-12); near(r.lsb, 5 / 1024, 1e-12); assert.equal(r.levels, 1024);
  r = E.adc({ bits: 10, vref: 5, value: 2.5, mode: 'v2c', convention: 'pow' }); assert.equal(r.out, 512);
  r = E.adc({ bits: 12, vref: 3.3, value: 4095, mode: 'c2v', convention: 'max' }); near(r.out, 3.3, 1e-9);
  r = E.adc({ bits: 12, vref: 3.3, value: 4, mode: 'v2c', convention: 'max' }); assert.equal(r.out, 4095); assert.ok(r.clipped);
  assert.ok(E.adc({ bits: 10, vref: 5, value: 2000, mode: 'c2v', convention: 'pow' }).error);
});
test('adc divider', () => {
  const r = E.adcDivider({ Vmax: 12, Vref: 3.3, head: 5, series: 'E24', bits: 12 });
  assert.ok(r.best.VadcMax <= 3.3); assert.ok(r.best.VadcMax > 3.0); near(r.best.ratio, (r.best.R1 + r.best.R2) / r.best.R2, 1e-12);
  assert.ok(E.adcDivider({ Vmax: 3, Vref: 3.3, series: 'E24' }).error);
  r.list.forEach(x => assert.ok(x.VadcMax <= 3.3 + 1e-9));
  ['arduino', 'esp32', 'micropython'].forEach(l => { const c = E.adcCode({ lang: l, R1: 30000, R2: 10000, Vref: 3.3, bits: 12 }); assert.ok(c.includes('30000') && c.includes('10000')); });
  assert.ok(E.adcCode({ lang: 'arduino', R1: 1, R2: 2, Vref: 5, bits: 10 }).includes('1023.0'));
});
test('pwm', () => {
  const r = E.pwm({ f: 1000, duty: 25, Vs: 5 }); near(r.T, 1e-3, 1e-12); near(r.ton, 250e-6, 1e-12); near(r.toff, 750e-6, 1e-12); near(r.avg, 1.25, 1e-12); near(r.fcFilter, 100, 1e-9);
  assert.ok(E.pwm({ f: 1000, duty: 120 }).error);
});
test('logic levels', () => {
  let r = E.logicLevels({ id: 'avr5' }, { id: 'esp32' }); assert.equal(r.verdict, 'danger');
  r = E.logicLevels({ id: 'esp32' }, { id: 'avr5' }); assert.equal(r.verdict, 'shifter'); assert.ok(r.highMargin < 0);
  r = E.logicLevels({ id: 'esp32' }, { id: 'hct5' }); assert.equal(r.verdict, 'ok');
  r = E.logicLevels({ id: 'esp32' }, { id: 'lvttl' }); assert.equal(r.verdict, 'ok');
  r = E.logicLevels({ id: 'custom', VOH: 3, VOL: 0.1, supply: 3.3 }, { id: 'custom', VIH: 2.9, VIL: 1, abs: 3.6 }); assert.equal(r.verdict, 'marginal');
  assert.ok(E.logicLevels({ id: 'custom', VOH: NaN, VOL: 0, supply: 3 }, { id: 'esp32' }).error);
});
test('uart', () => {
  let r = E.uart({ fclk: 16e6, baud: 9600, mode: 'x16' }); assert.equal(r.ubrr, 103); near(r.errPct, 0.16, 0.01);
  r = E.uart({ fclk: 16e6, baud: 115200, mode: 'x16' }); assert.equal(r.ubrr, 8); near(r.errPct, -3.55, 0.01);
  r = E.uart({ fclk: 16e6, baud: 115200, mode: 'x8' }); assert.equal(r.ubrr, 16); near(r.errPct, 2.12, 0.01);
  r = E.uart({ fclk: 8e6, baud: 9600, mode: 'x16' }); assert.equal(r.ubrr, 51);
});
test('avr timer', () => {
  let r = E.timerAvr({ fclk: 16e6, f: 1000, timer: 't0' }); assert.ok(r.list.some(x => x.prescaler === 64 && x.ocr === 249 && Math.abs(x.errPct) < 1e-9));
  assert.ok(r.list.every(x => x.ocr <= 255));
  r = E.timerAvr({ fclk: 16e6, f: 1000, timer: 't1' }); assert.equal(r.list[0].errPct, 0); assert.equal(r.list[0].prescaler, 1);
  assert.ok(E.timerAvr({ fclk: 16e6, f: 0.001, timer: 't0' }).error);
});
