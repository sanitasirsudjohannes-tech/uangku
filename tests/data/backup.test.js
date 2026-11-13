import test from 'node:test';
import assert from 'node:assert/strict';

import {
  backupFileName,
  buildBackup,
  mergeRecords,
  parseBackup,
  validateBackup,
} from '../../src/data/backup.js';
import { DEFAULT_CATEGORIES } from '../../src/data/schema.js';
import { baseExpense } from '../helpers/fixtures.js';
import { createTransaction } from '../../src/core/transaction.js';

const transaction = createTransaction(baseExpense, {
  id: 'tx_1',
  now: '2026-11-13T08:00:00.000Z',
});

const valid = buildBackup({
  transactions: [transaction],
  categories: DEFAULT_CATEGORIES,
  exportedAt: '2026-11-13T09:00:00.000Z',
});

test('buildBackup menyertakan metadata yang diperlukan', () => {
  assert.equal(valid.app, 'uangku');
  assert.equal(valid.schemaVersion, 1);
  assert.deepEqual(valid.counts, { transactions: 1, categories: DEFAULT_CATEGORIES.length });
});

test('backupFileName memakai tanggal ekspor', () => {
  assert.equal(backupFileName('2026-11-13T09:00:00.000Z'), 'uangku-backup-2026-11-13.json');
  assert.equal(backupFileName(null), 'uangku-backup-tanpa-tanggal.json');
});

test('validateBackup menerima cadangan yang sah', () => {
  const result = validateBackup(valid);
  assert.equal(result.ok, true);
  assert.equal(result.value.transactions.length, 1);
  assert.equal(result.value.categories.length, DEFAULT_CATEGORIES.length);
});

test('validateBackup menolak berkas dari aplikasi lain', () => {
  const result = validateBackup({ ...valid, app: 'aplikasi-lain' });
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /bukan cadangan aplikasi Uangku/);
});

test('validateBackup menolak skema dari masa depan', () => {
  const result = validateBackup({ ...valid, schemaVersion: 99 });
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /versi aplikasi yang lebih baru/);
});

test('validateBackup menolak transaksi tidak valid dan id ganda', () => {
  const broken = {
    ...valid,
    transactions: [
      { ...transaction, amount: -5 },
      { ...transaction },
      { ...transaction, note: 'duplikat id' },
    ],
  };
  const result = validateBackup(broken);
  assert.equal(result.ok, false);
  assert.ok(result.errors.length >= 2);
  assert.ok(result.errors.some((message) => /ganda/.test(message)));
});

test('validateBackup menolak struktur yang bukan objek', () => {
  for (const payload of [null, [], 'teks', 42]) {
    const result = validateBackup(payload);
    assert.equal(result.ok, false);
  }
});

test('parseBackup menangani JSON rusak', () => {
  assert.equal(parseBackup('{bukan json').ok, false);
  assert.equal(parseBackup('{}').ok, false);
  assert.equal(parseBackup(JSON.stringify(valid)).ok, true);
});

test('mergeRecords menambahkan yang baru dan memilih updatedAt terbaru', () => {
  const current = [
    { id: 'a', amount: 1, updatedAt: '2026-11-01T00:00:00.000Z' },
    { id: 'b', amount: 2, updatedAt: '2026-11-02T00:00:00.000Z' },
  ];
  const incoming = [
    { id: 'a', amount: 10, updatedAt: '2026-11-03T00:00:00.000Z' },
    { id: 'b', amount: 20, updatedAt: '2026-10-01T00:00:00.000Z' },
    { id: 'c', amount: 30, updatedAt: '2026-11-04T00:00:00.000Z' },
  ];

  const result = mergeRecords(current, incoming);
  assert.equal(result.added, 1);
  assert.equal(result.updated, 1);
  assert.equal(result.kept, 1);
  assert.equal(result.items.length, 3);

  const byId = new Map(result.items.map((row) => [row.id, row.amount]));
  assert.equal(byId.get('a'), 10);
  assert.equal(byId.get('b'), 2);
  assert.equal(byId.get('c'), 30);
});

test('mergeRecords aman untuk daftar kosong', () => {
  assert.deepEqual(mergeRecords([], []), { items: [], added: 0, updated: 0, kept: 0 });
});
