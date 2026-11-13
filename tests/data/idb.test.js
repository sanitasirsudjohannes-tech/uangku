import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';

import { createIdbAdapter } from '../../src/data/adapters/idb.js';
import { createRepository } from '../../src/data/repository.js';
import { DEFAULT_CATEGORIES, STORES } from '../../src/data/schema.js';
import { baseExpense, fakeClock, sequentialId } from '../helpers/fixtures.js';

function makeAdapter(factory, dbName = 'uangku-test') {
  return createIdbAdapter({ factory, dbName });
}

function makeRepo(factory, dbName = 'uangku-test') {
  return createRepository({
    adapter: makeAdapter(factory, dbName),
    makeId: sequentialId(),
    now: fakeClock(),
  });
}

test('adapter IndexedDB menyimpan dan membaca record', async () => {
  const factory = new IDBFactory();
  const adapter = makeAdapter(factory);
  await adapter.open();

  assert.deepEqual(await adapter.getAll(STORES.TRANSACTIONS), []);

  await adapter.put(STORES.META, { key: 'a', value: 1 });
  assert.deepEqual(await adapter.get(STORES.META, 'a'), { key: 'a', value: 1 });
  assert.equal(await adapter.count(STORES.META), 1);

  await adapter.put(STORES.META, { key: 'a', value: 2 });
  assert.equal((await adapter.get(STORES.META, 'a')).value, 2);
  assert.equal(await adapter.count(STORES.META), 1);

  await adapter.delete(STORES.META, 'a');
  assert.equal(await adapter.get(STORES.META, 'a'), undefined);

  await adapter.put(STORES.META, { key: 'b', value: 3 });
  await adapter.clear(STORES.META);
  assert.equal(await adapter.count(STORES.META), 0);

  await adapter.close();
});

test('adapter IndexedDB membuat object store dan index saat upgrade', async () => {
  const factory = new IDBFactory();
  const adapter = makeAdapter(factory, 'uangku-schema');
  await adapter.open();

  await adapter.put(STORES.TRANSACTIONS, {
    id: 'tx_1',
    type: 'expense',
    amount: 1000,
    categoryId: 'cat_makanan',
    note: '',
    date: '2026-11-13',
    month: '2026-11',
    createdAt: '2026-11-13T00:00:00.000Z',
    updatedAt: '2026-11-13T00:00:00.000Z',
  });

  const byMonth = await adapter.getAllByIndex(STORES.TRANSACTIONS, 'by_month', '2026-11');
  assert.equal(byMonth.length, 1);

  const otherMonth = await adapter.getAllByIndex(STORES.TRANSACTIONS, 'by_month', '2026-12');
  assert.deepEqual(otherMonth, []);

  await adapter.close();
});

test('bulkPut menyimpan banyak record dalam satu transaksi', async () => {
  const factory = new IDBFactory();
  const adapter = makeAdapter(factory, 'uangku-bulk');
  await adapter.open();

  const values = Array.from({ length: 25 }, (_, index) => ({ id: `cat_x${index}`, name: `X${index}` }));
  assert.equal(await adapter.bulkPut(STORES.CATEGORIES, values), 25);
  assert.equal(await adapter.count(STORES.CATEGORIES), 25);
  assert.equal(await adapter.bulkPut(STORES.CATEGORIES, []), 0);

  await adapter.close();
});

test('repository berjalan penuh di atas IndexedDB', async () => {
  const factory = new IDBFactory();
  const repo = makeRepo(factory, 'uangku-repo');
  const notes = await repo.init();
  assert.equal(notes.seededCategories, DEFAULT_CATEGORIES.length);

  const tx = await repo.create(baseExpense);
  assert.equal(tx.month, '2026-11');

  const listed = await repo.listByMonth('2026-11');
  assert.equal(listed.length, 1);
  assert.equal(listed[0].id, tx.id);

  const updated = await repo.update(tx.id, { amount: 31000 });
  assert.equal(updated.amount, 31000);

  await repo.remove(tx.id);
  assert.equal((await repo.listAll()).length, 0);

  const diag = await repo.diagnostics();
  assert.equal(diag.adapterKind, 'indexeddb');
  assert.equal(diag.transactionCount, 0);
});

test('data tetap ada setelah database ditutup dan dibuka ulang', async () => {
  const factory = new IDBFactory();

  const first = makeRepo(factory, 'uangku-persist');
  await first.init();
  const created = await first.create(baseExpense);
  await first.diagnostics();

  const second = makeRepo(factory, 'uangku-persist');
  await second.init();
  const list = await second.listByMonth('2026-11');
  assert.equal(list.length, 1);
  assert.equal(list[0].id, created.id);

  // init kedua tidak menyemai ulang kategori bawaan.
  assert.equal((await second.listCategories()).length, DEFAULT_CATEGORIES.length);
});

test('import replace pada IndexedDB benar-benar menghapus baris lama', async () => {
  const factory = new IDBFactory();
  const repo = makeRepo(factory, 'uangku-import');
  await repo.init();

  await repo.create({ ...baseExpense, date: '2026-11-01' });
  const backup = await repo.exportBackup();

  await repo.create({ ...baseExpense, date: '2026-11-02' });
  assert.equal((await repo.listAll()).length, 2);

  await repo.importBackup(backup, { mode: 'replace' });
  const list = await repo.listAll();
  assert.equal(list.length, 1);
  assert.equal(list[0].date, '2026-11-01');
});
