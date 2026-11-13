import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyPatch,
  createTransaction,
  isTransaction,
  sortTransactions,
  TYPES,
  validateTransactionInput,
} from '../../src/core/transaction.js';

const meta = { id: 'tx_1', now: '2026-11-13T10:00:00.000Z' };

const baseInput = {
  type: TYPES.EXPENSE,
  amount: 25000,
  categoryId: 'cat_makanan',
  note: 'Makan siang',
  date: '2026-11-13',
};

test('createTransaction menghasilkan record beku yang valid', () => {
  const tx = createTransaction(baseInput, meta);
  assert.equal(tx.id, 'tx_1');
  assert.equal(tx.month, '2026-11');
  assert.equal(tx.createdAt, meta.now);
  assert.equal(tx.updatedAt, meta.now);
  assert.equal(Object.isFrozen(tx), true);
  assert.equal(isTransaction(tx), true);
});

test('createTransaction membutuhkan id dan now dari pemanggil', () => {
  assert.throws(() => createTransaction(baseInput, { now: meta.now }), /id/);
  assert.throws(() => createTransaction(baseInput, { id: 'x' }), /now/);
});

test('validasi menolak input kosong dengan pesan per field', () => {
  const result = validateTransactionInput({});
  assert.equal(result.ok, false);
  assert.ok(result.errors.type);
  assert.ok(result.errors.amount);
  assert.ok(result.errors.categoryId);
  assert.ok(result.errors.date);
});

test('validasi menolak nominal nol, negatif, dan desimal', () => {
  for (const amount of [0, -1000, 1500.5, 'abc']) {
    const result = validateTransactionInput({ ...baseInput, amount });
    assert.equal(result.ok, false, `amount ${amount} seharusnya ditolak`);
    assert.ok(result.errors.amount);
  }
});

test('validasi menerima nominal berbentuk string angka', () => {
  const result = validateTransactionInput({ ...baseInput, amount: '15000' });
  assert.equal(result.ok, true);
  assert.equal(result.value.amount, 15000);
});

test('validasi menolak tanggal tidak valid dan menormalkan catatan', () => {
  const bad = validateTransactionInput({ ...baseInput, date: '2026-02-30' });
  assert.equal(bad.ok, false);

  const ok = validateTransactionInput({ ...baseInput, note: '  bayar   listrik  ' });
  assert.equal(ok.ok, true);
  assert.equal(ok.value.note, 'bayar listrik');
});

test('catatan terlalu panjang ditolak', () => {
  const result = validateTransactionInput({ ...baseInput, note: 'x'.repeat(201) });
  assert.equal(result.ok, false);
  assert.ok(result.errors.note);
});

test('createTransaction melempar ValidationError dengan detail', () => {
  assert.throws(
    () => createTransaction({ ...baseInput, amount: 0 }, meta),
    (error) => error.name === 'ValidationError' && Boolean(error.errors.amount),
  );
});

test('applyPatch memperbarui field dan updatedAt', () => {
  const tx = createTransaction(baseInput, meta);
  const patched = applyPatch(tx, { amount: 30000, date: '2026-12-01' }, {
    now: '2026-11-14T08:00:00.000Z',
  });
  assert.equal(patched.amount, 30000);
  assert.equal(patched.date, '2026-12-01');
  assert.equal(patched.month, '2026-12');
  assert.equal(patched.createdAt, meta.now);
  assert.equal(patched.updatedAt, '2026-11-14T08:00:00.000Z');
});

test('applyPatch mengabaikan field yang tidak boleh diubah', () => {
  const tx = createTransaction(baseInput, meta);
  const patched = applyPatch(tx, { id: 'dibajak', createdAt: 'lalu' }, { now: meta.now });
  assert.equal(patched.id, 'tx_1');
  assert.equal(patched.createdAt, meta.now);
});

test('applyPatch menolak perubahan yang membuat data tidak valid', () => {
  const tx = createTransaction(baseInput, meta);
  assert.throws(() => applyPatch(tx, { amount: -1 }, { now: meta.now }), /tidak valid/);
});

test('sortTransactions mengurutkan tanggal terbaru lebih dulu', () => {
  const make = (id, date, createdAt) =>
    createTransaction({ ...baseInput, date }, { id, now: createdAt });
  const list = [
    make('a', '2026-11-01', '2026-11-01T01:00:00.000Z'),
    make('b', '2026-11-13', '2026-11-13T01:00:00.000Z'),
    make('c', '2026-11-13', '2026-11-13T02:00:00.000Z'),
  ];
  assert.deepEqual(
    sortTransactions(list).map((row) => row.id),
    ['c', 'b', 'a'],
  );
});
