import test from 'node:test';
import assert from 'node:assert/strict';

import {
  byCategory,
  groupByDate,
  monthlyTrend,
  paginate,
  summarize,
} from '../../src/core/summary.js';

const rows = [
  { id: '1', type: 'income', amount: 500000, categoryId: 'cat_gaji', date: '2026-11-01', month: '2026-11' },
  { id: '2', type: 'expense', amount: 25000, categoryId: 'cat_makanan', date: '2026-11-13', month: '2026-11' },
  { id: '3', type: 'expense', amount: 15000, categoryId: 'cat_makanan', date: '2026-11-13', month: '2026-11' },
  { id: '4', type: 'expense', amount: 100000, categoryId: 'cat_tagihan', date: '2026-11-05', month: '2026-11' },
];

test('summarize menghitung masuk, keluar, dan saldo', () => {
  assert.deepEqual(summarize(rows), {
    income: 500000,
    expense: 140000,
    balance: 360000,
    count: 4,
  });
});

test('summarize pada daftar kosong menghasilkan nol', () => {
  assert.deepEqual(summarize([]), { income: 0, expense: 0, balance: 0, count: 0 });
});

test('summarize bisa menghasilkan saldo negatif', () => {
  const summary = summarize([rows[2]]);
  assert.equal(summary.balance, -15000);
});

test('byCategory mengelompokkan per jenis dan kategori, terbesar dulu', () => {
  const result = byCategory(rows);
  assert.deepEqual(
    result.map((row) => [row.categoryId, row.total]),
    [
      ['cat_gaji', 500000],
      ['cat_tagihan', 100000],
      ['cat_makanan', 40000],
    ],
  );
  assert.equal(result[2].count, 2);
  assert.equal(result[0].type, 'income');
  assert.equal(result[1].type, 'expense');
});

test('groupByDate mengelompokkan dan menghitung net harian', () => {
  const groups = groupByDate(rows);
  assert.equal(groups.length, 3);
  assert.equal(groups[0].date, '2026-11-13');
  assert.equal(groups[0].expense, 40000);
  assert.equal(groups[0].net, -40000);
  assert.equal(groups[2].income, 500000);
  assert.equal(groups[2].net, 500000);
});

test('paginate memotong daftar dan menjaga batas halaman', () => {
  const list = Array.from({ length: 120 }, (_, index) => ({ id: index }));
  const first = paginate(list, 1, 50);
  assert.equal(first.items.length, 50);
  assert.equal(first.page, 1);
  assert.equal(first.pageCount, 3);
  assert.equal(first.hasPrev, false);
  assert.equal(first.hasNext, true);

  const last = paginate(list, 3, 50);
  assert.equal(last.items.length, 20);
  assert.equal(last.hasNext, false);

  const overflow = paginate(list, 99, 50);
  assert.equal(overflow.page, 3);
});

test('paginate aman untuk daftar kosong', () => {
  const result = paginate([], 1, 50);
  assert.deepEqual(result.items, []);
  assert.equal(result.total, 0);
  assert.equal(result.pageCount, 1);
});

test('monthlyTrend mengurutkan bulan menaik', () => {
  const trend = monthlyTrend([
    ...rows,
    { id: '5', type: 'expense', amount: 10000, categoryId: 'cat_makanan', date: '2026-10-02', month: '2026-10' },
  ]);
  assert.deepEqual(trend.map((row) => row.month), ['2026-10', '2026-11']);
  assert.equal(trend[0].expense, 10000);
  assert.equal(trend[1].net, 360000);
});
