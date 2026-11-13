import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatAmountInput,
  formatRupiah,
  formatRupiahCompact,
  formatRupiahSigned,
  groupDigits,
  isIntegerRupiah,
  parseRupiah,
} from '../../src/core/currency.js';

test('formatRupiah memakai pemisah ribuan dan awalan Rp', () => {
  assert.equal(formatRupiah(0), 'Rp0');
  assert.equal(formatRupiah(1500), 'Rp1.500');
  assert.equal(formatRupiah(1500000), 'Rp1.500.000');
  assert.equal(formatRupiah(-25000), '-Rp25.000');
});

test('formatRupiah aman untuk nilai tidak valid', () => {
  assert.equal(formatRupiah(undefined), 'Rp0');
  assert.equal(formatRupiah(Number.NaN), 'Rp0');
  assert.equal(formatRupiah(1234.99), 'Rp1.234');
});

test('formatRupiahSigned memberi tanda arah', () => {
  assert.equal(formatRupiahSigned(50000), '+Rp50.000');
  assert.equal(formatRupiahSigned(-50000), '−Rp50.000');
  assert.equal(formatRupiahSigned(0), 'Rp0');
});

test('formatRupiahCompact meringkas angka besar', () => {
  assert.equal(formatRupiahCompact(900), 'Rp900');
  assert.equal(formatRupiahCompact(1500), 'Rp1,5 rb');
  assert.equal(formatRupiahCompact(1250000), 'Rp1,3 jt');
  assert.equal(formatRupiahCompact(2000000000), 'Rp2 M');
});

test('groupDigits hanya mengelompokkan angka', () => {
  assert.equal(groupDigits(1500000), '1.500.000');
  assert.equal(groupDigits(-1500000), '1.500.000');
});

test('parseRupiah menerima berbagai gaya penulisan', () => {
  assert.equal(parseRupiah('1.500.000'), 1500000);
  assert.equal(parseRupiah('1500000'), 1500000);
  assert.equal(parseRupiah('Rp 1.500.000'), 1500000);
  assert.equal(parseRupiah('1,500,000'), 1500000);
  assert.equal(parseRupiah(25000), 25000);
});

test('parseRupiah mengembalikan null bila tidak ada digit', () => {
  assert.equal(parseRupiah(''), null);
  assert.equal(parseRupiah('abc'), null);
  assert.equal(parseRupiah(undefined), null);
  assert.equal(parseRupiah(Number.POSITIVE_INFINITY), null);
});

test('isIntegerRupiah menolak nol, desimal, dan nilai terlalu besar', () => {
  assert.equal(isIntegerRupiah(1), true);
  assert.equal(isIntegerRupiah(0), false);
  assert.equal(isIntegerRupiah(-5), false);
  assert.equal(isIntegerRupiah(1.5), false);
  assert.equal(isIntegerRupiah('1000'), false);
  assert.equal(isIntegerRupiah(2_000_000_000_000_000), false);
});

test('formatAmountInput merapikan ketikan tanpa mengubah nilainya', () => {
  assert.equal(formatAmountInput(''), '');
  assert.equal(formatAmountInput('0015000'), '15.000');
  assert.equal(formatAmountInput('1.5'), '15');
  assert.equal(parseRupiah(formatAmountInput('0015000')), 15000);
});
