const test = require('node:test');
const assert = require('node:assert');
const B = require('../../../www/tools/bench/js/bench-logic.js');
const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, a + ' vs ' + b);

test('convert value', () => {
  const r = B.convertValue(0.0000047, 'F'); assert.equal(r.eng, '4.7 \u00b5F'); assert.ok(r.rows.some(x => x[1] === '4.7 \u00b5F')); assert.ok(r.rows.some(x => x[1] === '4700 nF'));
  assert.equal(B.convertValue(4700000, '\u03a9').eng, '4.7 M\u03a9'); assert.ok(B.convertValue(NaN, 'V').error);
});
test('frequency and period', () => {
  let r = B.freqPeriod({ mode: 'f', value: 1000 }); near(r.t, 1e-3, 1e-12); near(r.lambda, 299792.458, 1e-3);
  r = B.freqPeriod({ mode: 't', value: 20e-6 }); near(r.f, 50000, 1e-6);
  r = B.freqPeriod({ mode: 'f', value: 433.92e6, vf: 0.66 }); near(r.quarter, 299792458 * 0.66 / 433.92e6 / 4, 1e-9);
  assert.ok(B.freqPeriod({ mode: 'f', value: 0 }).error);
});
test('number bases', () => {
  let r = B.numberBases({ base: 'hex', text: 'FF' }); assert.equal(r.dec, '255'); assert.equal(r.bin, '0b11111111'); assert.equal(r.int8, '-1'); assert.equal(r.int16, '255'); assert.equal(r.bytes, 1);
  r = B.numberBases({ base: 'dec', text: '65' }); assert.equal(r.hex, '0x41'); assert.equal(r.ascii, 'A'); assert.equal(r.binGrouped, '0100 0001');
  r = B.numberBases({ base: 'bin', text: '0b1010_0101' }); assert.equal(r.dec, '165'); r = B.numberBases({ base: 'oct', text: '777' }); assert.equal(r.dec, '511');
  assert.ok(B.numberBases({ base: 'bin', text: '102' }).error); assert.ok(B.numberBases({ base: 'hex', text: 'FFFFFFFFFFFFFFFFF' }).error);
  assert.equal(B.numberBases({ base: 'hex', text: 'FFFFFFFFFFFFFFFF' }).dec, '18446744073709551615');
});
test('e-series finder', () => {
  const r = B.eSeriesFinder({ value: 13700, series: 'E24' }); const by = {}; r.rows.forEach(x => by[x.series] = x);
  assert.equal(by.E12.nearest, 15000); assert.equal(by.E24.nearest, 13000); assert.equal(by.E96.nearest, 13700); assert.equal(by.E12.below, 12000); assert.equal(by.E12.above, 15000);
  near(by.E96.errPct, 0, 1e-9); assert.ok(r.combos.length > 0); assert.ok(B.eSeriesFinder({ value: 0 }).error);
});
test('i2c', () => {
  const names = a => B.i2cByAddresses(a).list[0].devices.join('|');
  assert.ok(names('0x68').includes('MPU-6050') && names('0x68').includes('DS3231')); assert.ok(names('0x3C').includes('SSD1306'));
  assert.deepEqual(B.i2cByAddresses('0x3C 0x68').list.map(x => x.addr), [0x3C, 0x68]); assert.ok(B.i2cByAddresses('0x80').error);
  assert.ok(B.i2cSearch('bme').length >= 1); assert.ok(B.i2cSearch('0x76').some(d => d.name.includes('BME280'))); assert.equal(B.i2cSearch('').length, B.I2C.length);
  assert.equal(B.addrText([0x20, 0x21, 0x22, 0x23]), '0x20 to 0x23'); assert.equal(B.addrText([0x3C, 0x3D]), '0x3C, 0x3D');
  B.I2C.forEach(d => d[2].forEach(a => assert.ok(a > 0 && a < 0x78, d[0])));
});
test('cheat sheet data', () => {
  assert.equal(B.COLORS.length, 12); assert.equal(B.AWG_ROWS.length, 14); near(B.AWG_ROWS.find(r => r.awg === 22).d, 0.6438, 1e-3); assert.equal(B.CAP_CODES.find(c => c[0] === '104')[1], '100 nF');
});
