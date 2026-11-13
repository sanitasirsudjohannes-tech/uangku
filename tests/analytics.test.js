import test from 'node:test';
import assert from 'node:assert/strict';

import { analyzeTransactions } from '../src/core/analytics.js';
import { createActions, initialState, TABS } from '../src/app/actions.js';
import { createStore } from '../src/app/store.js';

const transactions = [
  { id: '1', type: 'income', amount: 5_000_000, categoryId: 'salary', month: '2026-09' },
  { id: '2', type: 'expense', amount: 1_000_000, categoryId: 'food', month: '2026-09' },
  { id: '3', type: 'income', amount: 5_000_000, categoryId: 'salary', month: '2026-10' },
  { id: '4', type: 'expense', amount: 2_000_000, categoryId: 'food', month: '2026-10' },
  { id: '5', type: 'expense', amount: 500_000, categoryId: 'transport', month: '2026-10' },
  { id: '6', type: 'income', amount: 5_000_000, categoryId: 'salary', month: '2026-11' },
  { id: '7', type: 'expense', amount: 1_500_000, categoryId: 'food', month: '2026-11' },
  { id: '8', type: 'expense', amount: 500_000, categoryId: 'transport', month: '2026-11' },
];

test('analisis mengisi bulan kosong dan menghitung ringkasan periode', () => {
  const result = analyzeTransactions(transactions, { endMonth: '2026-11', months: 3 });

  assert.deepEqual(result.monthKeys, ['2026-09', '2026-10', '2026-11']);
  assert.deepEqual(result.trend.map((row) => row.expense), [1_000_000, 2_500_000, 2_000_000]);
  assert.equal(result.summary.income, 15_000_000);
  assert.equal(result.summary.expense, 5_500_000);
  assert.equal(result.summary.balance, 9_500_000);
  assert.equal(result.averages.expense, Math.round(5_500_000 / 3));
});

test('analisis kategori mengurutkan pengeluaran dan menghitung proporsi', () => {
  const result = analyzeTransactions(transactions, { endMonth: '2026-11', months: 3 });

  assert.equal(result.topCategories[0].categoryId, 'food');
  assert.equal(result.topCategories[0].total, 4_500_000);
  assert.equal(result.topCategories[0].sharePercent, 81.8);
  assert.equal(result.topCategories[1].categoryId, 'transport');
});

test('perbandingan bulan terakhir menggunakan baseline bulan sebelumnya', () => {
  const result = analyzeTransactions(transactions, { endMonth: '2026-11', months: 3 });

  assert.equal(result.comparison.expenseChangePercent, -20);
  assert.equal(result.insights.find((item) => item.type === 'expense-change').changePercent, -20);
});

test('rentang analisis melintasi pergantian tahun dengan benar', () => {
  const result = analyzeTransactions([], { endMonth: '2027-01', months: 3 });
  assert.deepEqual(result.monthKeys, ['2026-11', '2026-12', '2027-01']);
  assert.equal(result.summary.count, 0);
  assert.equal(result.insights[0].type, 'no-data');
});

test('transaksi di luar rentang tidak ikut dihitung', () => {
  const result = analyzeTransactions(
    [...transactions, { id: '9', type: 'expense', amount: 9_000_000, categoryId: 'other', month: '2026-08' }],
    { endMonth: '2026-11', months: 3 },
  );
  assert.equal(result.summary.expense, 5_500_000);
});

test('periode dan bulan akhir yang tidak valid ditolak', () => {
  assert.throws(() => analyzeTransactions([], { endMonth: '2026-13', months: 3 }), /bulan akhir/);
  assert.throws(() => analyzeTransactions([], { endMonth: '2026-11', months: 4 }), /3, 6, atau 12/);
});

test('actions mengambil bulan melalui repository dan menyimpan hasil di store', async () => {
  const calls = [];
  const repo = {
    listByMonth: async (month) => {
      calls.push(month);
      return transactions.filter((item) => item.month === month);
    },
  };
  const store = createStore({
    ...initialState,
    month: '2026-11',
    analytics: { ...initialState.analytics },
  });
  const actions = createActions({
    repo,
    store,
    now: () => '2026-11-13T08:00:00.000Z',
    today: () => '2026-11-13',
  });

  const data = await actions.loadAnalytics(3);

  assert.deepEqual(calls, ['2026-09', '2026-10', '2026-11']);
  assert.equal(data.summary.expense, 5_500_000);
  assert.equal(store.getState().analytics.loading, false);
  assert.equal(store.getState().analytics.period, 3);
  assert.equal(store.getState().analytics.data.summary.income, 15_000_000);
});

test('memilih tab analisis otomatis memuat data', async () => {
  const repo = { listByMonth: async () => [] };
  const store = createStore({
    ...initialState,
    month: '2026-11',
    analytics: { ...initialState.analytics },
  });
  const actions = createActions({
    repo,
    store,
    now: () => '2026-11-13T08:00:00.000Z',
    today: () => '2026-11-13',
  });

  await actions.setTab(TABS.ANALYTICS);
  assert.equal(store.getState().tab, TABS.ANALYTICS);
  assert.equal(store.getState().analytics.data.summary.count, 0);
});
