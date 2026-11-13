import test from 'node:test';
import assert from 'node:assert/strict';

import { createStore } from '../../src/app/store.js';
import { createActions, initialState, TABS } from '../../src/app/actions.js';
import { selectHistory, selectTopCategories } from '../../src/app/selectors.js';
import { baseExpense } from '../helpers/fixtures.js';
import { makeRepo } from '../helpers/fixtures.js';

const TODAY = '2026-11-13';
const NOW = '2026-11-13T08:00:00.000Z';

function setup() {
  const store = createStore({ ...initialState });
  const actions = createActions({
    repo: makeRepo(),
    store,
    now: () => NOW,
    today: () => TODAY,
  });
  return { store, actions };
}

test('init memuat kategori, bulan berjalan, dan ringkasan', async () => {
  const { store, actions } = setup();
  await actions.init();

  const state = store.getState();
  assert.equal(state.ready, true);
  assert.equal(state.month, '2026-11');
  assert.equal(state.categories.length, 11);
  assert.deepEqual(state.summary, { income: 0, expense: 0, balance: 0, count: 0 });
  assert.equal(state.fatalError, null);
});

test('saveTransaction menambah data, ringkasan, dan kelompok harian', async () => {
  const { store, actions } = setup();
  await actions.init();
  await actions.saveTransaction({ ...baseExpense, amount: 25000 });

  const state = store.getState();
  assert.equal(state.transactions.length, 1);
  assert.equal(state.summary.expense, 25000);
  assert.equal(state.summary.balance, -25000);
  assert.equal(state.groups.length, 1);
  assert.equal(state.groups[0].date, '2026-11-13');
  assert.ok(state.toast?.message.includes('Rp25.000'));
});

test('saveTransaction meneruskan galat validasi ke form', async () => {
  const { actions } = setup();
  await actions.init();

  await assert.rejects(
    () => actions.saveTransaction({ ...baseExpense, amount: 0 }),
    (error) => {
      assert.equal(error.name, 'FormError');
      assert.ok(error.fieldErrors.amount);
      return true;
    },
  );
});

test('transaksi pada bulan lain memindahkan tampilan ke bulan tersebut', async () => {
  const { store, actions } = setup();
  await actions.init();

  await actions.saveTransaction({ ...baseExpense, date: '2026-09-05' });
  assert.equal(store.getState().month, '2026-09');
  assert.equal(store.getState().transactions.length, 1);
});

test('update dan delete memperbarui state', async () => {
  const { store, actions } = setup();
  await actions.init();
  const created = await actions.saveTransaction(baseExpense);

  await actions.saveTransaction({ amount: 40000 }, { id: created.id });
  assert.equal(store.getState().summary.expense, 40000);

  await actions.deleteTransaction(created.id);
  assert.equal(store.getState().transactions.length, 0);
  assert.equal(store.getState().summary.expense, 0);
});

test('shiftMonth dan setTab mengubah state', async () => {
  const { store, actions } = setup();
  await actions.init();

  await actions.shiftMonth(-1);
  assert.equal(store.getState().month, '2026-10');

  await actions.shiftMonth(2);
  assert.equal(store.getState().month, '2026-12');

  actions.setTab(TABS.HISTORY);
  assert.equal(store.getState().tab, 'history');

  actions.setTab('tidak-ada');
  assert.equal(store.getState().tab, 'history');
});

test('setMonth menolak kunci bulan tidak valid', async () => {
  const { store, actions } = setup();
  await actions.init();
  await actions.setMonth('2026-13');
  assert.equal(store.getState().month, '2026-11');
});

test('goToToday kembali ke bulan hari ini', async () => {
  const { store, actions } = setup();
  await actions.init();
  await actions.setMonth('2025-01');
  await actions.goToToday();
  assert.equal(store.getState().month, '2026-11');
});

test('addCategory dan removeCategory menyinkronkan daftar kategori', async () => {
  const { store, actions } = setup();
  await actions.init();

  const category = await actions.addCategory('Kopi', 'expense');
  assert.equal(store.getState().categories.length, 12);
  assert.equal(category.name, 'Kopi');

  await actions.removeCategory(category.id);
  assert.equal(store.getState().categories.length, 11);
});

test('exportBackup menghasilkan teks JSON yang bisa diimpor kembali', async () => {
  const { store, actions } = setup();
  await actions.init();
  await actions.saveTransaction(baseExpense);

  const exported = await actions.exportBackup();
  assert.match(exported.filename, /^uangku-backup-\d{4}-\d{2}-\d{2}\.json$/);
  assert.equal(JSON.parse(exported.text).counts.transactions, 1);
  assert.match(store.getState().storage.lastBackupAt, /^2026-11-13T/);

  const result = await actions.importBackup(exported.text, 'merge');
  assert.equal(result.transactions.added, 0);
  assert.equal(result.transactions.kept, 1);
  assert.ok(store.getState().lastImport);
  assert.equal(store.getState().transactions.length, 1);
});

test('importBackup yang rusak memberi toast galat dan tidak mengubah data', async () => {
  const { store, actions } = setup();
  await actions.init();
  await actions.saveTransaction(baseExpense);

  await assert.rejects(() => actions.importBackup('{rusak'));
  assert.equal(store.getState().transactions.length, 1);
  assert.equal(store.getState().toast.kind, 'error');
});

test('diagnostics terisi setelah refresh', async () => {
  const { store, actions } = setup();
  await actions.init();
  const diag = store.getState().diagnostics;
  assert.equal(diag.transactionCount, 0);
  assert.equal(diag.schemaVersion, 1);
  assert.equal(store.getState().storage.supported, false);
});

test('selector riwayat dan kategori teratas bekerja di atas state', async () => {
  const { store, actions } = setup();
  await actions.init();
  await actions.saveTransaction(baseExpense);
  await actions.saveTransaction({
    ...baseExpense,
    amount: 100000,
    categoryId: 'cat_tagihan',
  });

  const history = selectHistory(store.getState(), 1);
  assert.equal(history.total, 2);
  assert.equal(history.items.length, 1);

  const top = selectTopCategories(store.getState(), 2);
  assert.equal(top[0].categoryId, 'cat_tagihan');
  assert.equal(top[0].name, 'Tagihan');
  assert.equal(top[0].emoji, '🧾');
});

test('store tidak memberi tahu listener bila state tidak berubah', () => {
  const store = createStore({ a: 1 });
  let calls = 0;
  const unsubscribe = store.subscribe(() => {
    calls += 1;
  });

  store.setState({ a: 1 });
  assert.equal(calls, 0);

  store.setState({ a: 2 });
  assert.equal(calls, 1);

  unsubscribe();
  store.setState({ a: 3 });
  assert.equal(calls, 1);
});

test('listener yang error tidak menghentikan listener lain', () => {
  const store = createStore({ a: 1 });
  let second = 0;
  const originalError = console.error;
  console.error = () => {};
  store.subscribe(() => {
    throw new Error('boom');
  });
  store.subscribe(() => {
    second += 1;
  });
  store.setState({ a: 2 });
  console.error = originalError;
  assert.equal(second, 1);
});
