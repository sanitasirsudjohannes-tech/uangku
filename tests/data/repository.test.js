import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CATEGORIES } from '../../src/data/schema.js';
import { TYPES } from '../../src/core/transaction.js';
import { baseExpense as baseInput, makeRepo } from '../helpers/fixtures.js';

test('init menyemai kategori bawaan sekali saja', async () => {
  const repo = makeRepo();
  const notes = await repo.init();
  assert.equal(notes.seededCategories, DEFAULT_CATEGORIES.length);

  const categories = await repo.listCategories();
  assert.equal(categories.length, DEFAULT_CATEGORIES.length);

  const second = await repo.init();
  assert.equal(second.seededCategories, 0);
  assert.equal((await repo.listCategories()).length, DEFAULT_CATEGORIES.length);
});

test('operasi sebelum init ditolak dengan jelas', async () => {
  const repo = makeRepo();
  await assert.rejects(() => repo.listAll(), /inisialisasi/);
});

test('create menyimpan transaksi dan mengisi bulan otomatis', async () => {
  const repo = makeRepo();
  await repo.init();
  const tx = await repo.create(baseInput);
  assert.equal(tx.month, '2026-11');

  const list = await repo.listByMonth('2026-11');
  assert.equal(list.length, 1);
  assert.equal(list[0].id, tx.id);
  assert.deepEqual(await repo.listByMonth('2026-12'), []);
});

test('listByMonth menolak kunci bulan tidak valid', async () => {
  const repo = makeRepo();
  await repo.init();
  await assert.rejects(() => repo.listByMonth('2026-13'), /bulan tidak valid/);
});

test('create menolak data tidak valid tanpa menyimpan apa pun', async () => {
  const repo = makeRepo();
  await repo.init();
  await assert.rejects(() => repo.create({ ...baseInput, amount: 0 }), /tidak valid/);
  assert.equal((await repo.listAll()).length, 0);
});

test('update mengubah data dan memindahkan index bulan', async () => {
  const repo = makeRepo();
  await repo.init();
  const tx = await repo.create(baseInput);

  const updated = await repo.update(tx.id, { amount: 30000, date: '2026-12-02' });
  assert.equal(updated.amount, 30000);
  assert.equal(updated.month, '2026-12');
  assert.deepEqual(await repo.listByMonth('2026-11'), []);
  assert.equal((await repo.listByMonth('2026-12')).length, 1);
});

test('update menolak id yang tidak ada', async () => {
  const repo = makeRepo();
  await repo.init();
  await assert.rejects(() => repo.update('tidak-ada', { amount: 1 }), (error) => {
    assert.equal(error.code, 'not-found');
    return true;
  });
});

test('remove menghapus transaksi dan menolak id asing', async () => {
  const repo = makeRepo();
  await repo.init();
  const tx = await repo.create(baseInput);
  await repo.remove(tx.id);
  assert.equal((await repo.listAll()).length, 0);
  await assert.rejects(() => repo.remove(tx.id), /tidak ditemukan/);
});

test('addCategory menolak duplikat nama pada jenis yang sama', async () => {
  const repo = makeRepo();
  await repo.init();

  await repo.addCategory({ name: 'Kopi', type: TYPES.EXPENSE });
  await assert.rejects(() => repo.addCategory({ name: 'kopi', type: TYPES.EXPENSE }), (error) => {
    assert.equal(error.code, 'conflict');
    return true;
  });

  // Nama sama boleh dipakai pada jenis berbeda.
  const income = await repo.addCategory({ name: 'Kopi', type: TYPES.INCOME });
  assert.equal(income.type, TYPES.INCOME);
});

test('addCategory memvalidasi nama', async () => {
  const repo = makeRepo();
  await repo.init();
  await assert.rejects(() => repo.addCategory({ name: '   ', type: TYPES.EXPENSE }), /wajib diisi/);
  await assert.rejects(
    () => repo.addCategory({ name: 'x'.repeat(25), type: TYPES.EXPENSE }),
    /maksimal/,
  );
});

test('removeCategory melindungi kategori bawaan dan yang sedang dipakai', async () => {
  const repo = makeRepo();
  await repo.init();

  await assert.rejects(() => repo.removeCategory('cat_makanan'), (error) => {
    assert.equal(error.code, 'system');
    return true;
  });

  const category = await repo.addCategory({ name: 'Kopi', type: TYPES.EXPENSE });
  await repo.create({ ...baseInput, categoryId: category.id });

  await assert.rejects(() => repo.removeCategory(category.id), (error) => {
    assert.equal(error.code, 'conflict');
    assert.equal(error.usedBy, 1);
    return true;
  });
});

test('export/import merge tidak menduplikasi dan menghormati updatedAt', async () => {
  const repo = makeRepo();
  await repo.init();
  const tx = await repo.create(baseInput);

  const backup = await repo.exportBackup();
  assert.equal(backup.transactions.length, 1);
  assert.equal(backup.counts.transactions, 1);

  const merged = await repo.importBackup(backup, { mode: 'merge' });
  assert.equal(merged.transactions.added, 0);
  assert.equal(merged.transactions.kept, 1);
  assert.equal((await repo.listAll()).length, 1);

  const edited = {
    ...backup,
    transactions: [{ ...tx, amount: 99000, updatedAt: '2027-01-01T00:00:00.000Z' }],
  };
  const result = await repo.importBackup(edited, { mode: 'merge' });
  assert.equal(result.transactions.updated, 1);
  assert.equal((await repo.listAll())[0].amount, 99000);
});

test('import replace mengganti seluruh transaksi', async () => {
  const repo = makeRepo();
  await repo.init();
  await repo.create(baseInput);
  const backup = await repo.exportBackup();

  await repo.create({ ...baseInput, amount: 5000, date: '2026-11-14' });
  assert.equal((await repo.listAll()).length, 2);

  const result = await repo.importBackup(backup, { mode: 'replace' });
  assert.equal(result.mode, 'replace');
  assert.equal((await repo.listAll()).length, 1);
});

test('import menolak cadangan dengan kategori yatim', async () => {
  const repo = makeRepo();
  await repo.init();
  const backup = await repo.exportBackup();
  const broken = {
    ...backup,
    transactions: [
      {
        id: 'tx_x',
        type: 'expense',
        amount: 1000,
        categoryId: 'cat_tidak_ada',
        note: '',
        date: '2026-11-13',
        month: '2026-11',
        createdAt: '2026-11-13T00:00:00.000Z',
        updatedAt: '2026-11-13T00:00:00.000Z',
      },
    ],
  };
  await assert.rejects(() => repo.importBackup(broken), /kategori yang tidak ditemukan/);
});

test('cermin localStorage menerima snapshot setelah perubahan', async () => {
  const saves = [];
  const mirror = {
    available: () => true,
    save: async (snapshot) => {
      saves.push(snapshot);
      return { saved: true };
    },
    load: () => null,
    status: () => ({}),
  };

  const repo = makeRepo({ mirror });
  await repo.init();
  await repo.create(baseInput);
  assert.equal(saves.length, 1);
  assert.equal(saves[0].app, 'uangku');
  assert.equal(saves[0].transactions.length, 1);
});

test('diagnostics melaporkan jumlah baris dan versi skema', async () => {
  const repo = makeRepo();
  await repo.init();
  await repo.create(baseInput);
  const diag = await repo.diagnostics();
  assert.equal(diag.transactionCount, 1);
  assert.equal(diag.categoryCount, DEFAULT_CATEGORIES.length);
  assert.equal(diag.schemaVersion, 1);
  assert.equal(diag.adapterKind, 'memory');
  assert.ok(diag.deviceId);
});

test('createMany menyimpan banyak transaksi sekaligus', async () => {
  const repo = makeRepo();
  await repo.init();
  const created = await repo.createMany([
    { ...baseInput, amount: 1000 },
    { ...baseInput, amount: 2000 },
  ]);
  assert.equal(created.length, 2);
  assert.equal((await repo.listAll()).length, 2);
});
