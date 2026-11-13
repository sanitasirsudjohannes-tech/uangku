import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addMonths,
  dateToISO,
  dayName,
  formatDateLong,
  isInMonth,
  isValidISODate,
  isValidMonthKey,
  monthBounds,
  monthKeyOf,
  monthLabel,
  monthShortLabel,
  parseISODate,
  relativeDayLabel,
  toISODate,
} from '../../src/core/period.js';

test('toISODate mem-pad bulan dan hari', () => {
  assert.equal(toISODate(2026, 1, 5), '2026-01-05');
  assert.equal(toISODate(2026, 11, 13), '2026-11-13');
});

test('dateToISO memakai tanggal lokal perangkat', () => {
  const local = new Date(2026, 10, 13, 23, 30);
  assert.equal(dateToISO(local), '2026-11-13');
});

test('isValidISODate menolak tanggal yang tidak ada', () => {
  assert.equal(isValidISODate('2026-02-28'), true);
  assert.equal(isValidISODate('2024-02-29'), true);
  assert.equal(isValidISODate('2026-02-29'), false);
  assert.equal(isValidISODate('2026-13-01'), false);
  assert.equal(isValidISODate('2026-04-31'), false);
  assert.equal(isValidISODate('13-11-2026'), false);
  assert.equal(isValidISODate(''), false);
});

test('parseISODate mengembalikan bagian tanggal', () => {
  assert.deepEqual(parseISODate('2026-11-13'), { year: 2026, month: 11, day: 13 });
  assert.equal(parseISODate('2026-11-31'), null);
});

test('isValidMonthKey dan monthKeyOf konsisten', () => {
  assert.equal(isValidMonthKey('2026-11'), true);
  assert.equal(isValidMonthKey('2026-13'), false);
  assert.equal(isValidMonthKey('2026-1'), false);
  assert.equal(monthKeyOf('2026-11-13'), '2026-11');
});

test('addMonths melewati batas tahun ke dua arah', () => {
  assert.equal(addMonths('2026-11', 1), '2026-12');
  assert.equal(addMonths('2026-12', 1), '2027-01');
  assert.equal(addMonths('2026-01', -1), '2025-12');
  assert.equal(addMonths('2026-11', 14), '2028-01');
});

test('label bulan dalam bahasa Indonesia', () => {
  assert.equal(monthLabel('2026-11'), 'November 2026');
  assert.equal(monthShortLabel('2026-08'), 'Agu 2026');
  assert.equal(formatDateLong('2026-11-13'), '13 November 2026');
});

test('monthBounds menangani tahun kabisat', () => {
  assert.deepEqual(monthBounds('2024-02'), { start: '2024-02-01', end: '2024-02-29' });
  assert.deepEqual(monthBounds('2026-11'), { start: '2026-11-01', end: '2026-11-30' });
});

test('relativeDayLabel memberi label ramah', () => {
  assert.equal(relativeDayLabel('2026-11-13', '2026-11-13'), 'Hari ini');
  assert.equal(relativeDayLabel('2026-11-12', '2026-11-13'), 'Kemarin');
  assert.equal(relativeDayLabel('2026-11-05', '2026-11-13'), '5 Nov 2026');
});

test('dayName dan isInMonth', () => {
  assert.equal(dayName('2026-11-13'), 'Jumat');
  assert.equal(isInMonth('2026-11-30', '2026-11'), true);
  assert.equal(isInMonth('2026-12-01', '2026-11'), false);
});
