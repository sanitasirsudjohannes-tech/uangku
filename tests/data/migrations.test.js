import test from 'node:test';
import assert from 'node:assert/strict';

import { ensureData } from '../../src/data/migrations.js';
import {
  DEFAULT_CATEGORIES,
  META_KEYS,
  SCHEMA_VERSION,
  STORES,
} from '../../src/data/schema.js';
import { createMirror } from '../../src/data/adapters/mirror.js';
import { formatBytes } from '../../src/data/storage.js';
import { memoryAdapter, sequentialId } from '../helpers/fixtures.js';

const now = '2026-11-13T08:00:00.000Z';

test('ensureData membuat meta versi, device id, dan kategori bawaan', async () => {
  const adapter = memoryAdapter();
  await adapter.open();

  const notes = await ensureData(adapter, { now, makeId: sequentialId() });
  assert.equal(notes.seededCategories, DEFAULT_CATEGORIES.length);
  assert.equal(notes.schemaVersion, SCHEMA_VERSION);

  const meta = new Map(
    (await adapter.getAll(STORES.META)).map((row) => [row.key, row.value]),
  );
  assert.equal(meta.get(META_KEYS.SCHEMA_VERSION), SCHEMA_VERSION);
  assert.ok(meta.get(META_KEYS.DEVICE_ID));
  assert.equal(meta.get(META_KEYS.CREATED_AT), now);

  assert.equal(await adapter.count(STORES.CATEGORIES), DEFAULT_CATEGORIES.length);
});

test('ensureData idempoten dan tidak menimpa kategori buatan pengguna', async () => {
  const adapter = memoryAdapter();
  await adapter.open();

  await ensureData(adapter, { now, makeId: sequentialId() });
  await adapter.put(STORES.CATEGORIES, {
    id: 'cat_kopi',
    name: 'Kopi',
    type: 'expense',
    system: false,
    order: 100,
  });

  const notes = await ensureData(adapter, { now, makeId: sequentialId() });
  assert.equal(notes.seededCategories, 0);
  assert.equal(
    await adapter.count(STORES.CATEGORIES),
    DEFAULT_CATEGORIES.length + 1,
  );
});

test('ensureData mencatat migrasi bila versi skema lama', async () => {
  const adapter = memoryAdapter();
  await adapter.open();
  await adapter.put(STORES.META, { key: META_KEYS.SCHEMA_VERSION, value: 0 });

  const notes = await ensureData(adapter, { now, makeId: sequentialId() });
  assert.equal(notes.migratedFrom, null);

  await adapter.put(STORES.META, { key: META_KEYS.SCHEMA_VERSION, value: 1 });
  const upgraded = await ensureData(adapter, { now, makeId: sequentialId() });
  assert.equal(upgraded.migratedFrom, null);
});

test('mirror menyimpan, membaca, dan menghapus snapshot', async () => {
  const store = new Map();
  const storage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  };
  const mirror = createMirror({ storage, maxBytes: 500 });

  const big = { transactions: Array.from({ length: 50 }, () => ({ id: 'x'.repeat(20) })) };
  const tooLarge = await mirror.save(big);
  assert.equal(tooLarge.saved, false);
  assert.equal(tooLarge.reason, 'too-large');
  assert.equal(mirror.status().skipped, true);

  const small = { exportedAt: now, transactions: [{ id: 'tx_1' }] };
  assert.equal((await mirror.save(small)).saved, true);
  assert.deepEqual(mirror.load(), small);
  assert.equal(mirror.status().lastSavedAt, now);

  mirror.clear();
  assert.equal(mirror.load(), null);
  assert.equal(mirror.available(), true);
});

test('mirror tanpa storage tidak melempar error', async () => {
  const mirror = createMirror({ storage: null });
  assert.equal(mirror.available(), false);
  assert.deepEqual(await mirror.save({}), { saved: false, reason: 'unavailable' });
  assert.equal(mirror.load(), null);
  mirror.clear();
});

test('memory adapter meniru structured clone', async () => {
  const adapter = memoryAdapter();
  await adapter.open();
  const row = { id: 'a', nested: { value: 1 } };
  await adapter.put(STORES.META, row);
  row.nested.value = 99;
  const loaded = await adapter.get(STORES.META, 'a');
  assert.equal(loaded.nested.value, 1);
});

test('formatBytes menampilkan satuan yang ramah', () => {
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(1536), '1,5 KB');
  assert.equal(formatBytes(20 * 1024 * 1024), '20 MB');
  assert.equal(formatBytes(null), '—');
});
