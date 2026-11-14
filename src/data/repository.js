/**
 * Repository — satu-satunya pintu masuk penulisan data.
 * Lapisan app/ui tidak pernah menyentuh adapter secara langsung,
 * sehingga sinkronisasi cloud bisa ditambahkan nanti tanpa membongkar UI.
 */
import {
  applyPatch,
  createTransaction,
  isTransaction,
  sortTransactions,
  TYPES,
} from '../core/transaction.js';
import { monthKeyOf, isValidISODate, isValidMonthKey } from '../core/period.js';
import { INDEXES, META_KEYS, SCHEMA_VERSION, STORES } from './schema.js';
import { ensureData } from './migrations.js';
import { buildBackup, mergeRecords, validateBackup } from './backup.js';

export const ERRORS = Object.freeze({
  VALIDATION: 'validation',
  CONFLICT: 'conflict',
  NOT_FOUND: 'not-found',
  SYSTEM: 'system',
});

function domainError(code, message, extra = {}) {
  const error = new Error(message);
  error.name = 'DomainError';
  error.code = code;
  Object.assign(error, extra);
  return error;
}

const MIRROR_MAX_ROWS = 5000;
const CATEGORY_NAME_MAX = 24;

/**
 * @param {{
 *   adapter: ReturnType<typeof import('./adapters/memory.js').createMemoryAdapter>,
 *   mirror?: ReturnType<typeof import('./adapters/mirror.js').createMirror>|null,
 *   makeId: (prefix?: string) => string,
 *   now: () => string,
 * }} deps
 */
export function createRepository({ adapter, mirror = null, makeId, now }) {
  if (!adapter) throw new TypeError('createRepository membutuhkan adapter.');
  if (typeof makeId !== 'function') throw new TypeError('createRepository membutuhkan makeId.');
  if (typeof now !== 'function') throw new TypeError('createRepository membutuhkan now().');

  let initialized = false;

  async function init() {
    await adapter.open();
    const notes = await ensureData(adapter, { now: now(), makeId });
    initialized = true;
    return notes;
  }

  function assertReady() {
    if (!initialized) {
      throw domainError(ERRORS.SYSTEM, 'Database belum diinisialisasi. Panggil init() dulu.');
    }
  }

  async function readMonth(month) {
    assertReady();
    if (!isValidMonthKey(month)) {
      throw domainError(ERRORS.VALIDATION, 'Kunci bulan tidak valid.');
    }
    const rows = await adapter.getAllByIndex(STORES.TRANSACTIONS, INDEXES.BY_MONTH, month);
    return sortTransactions(rows);
  }

  async function readAll() {
    assertReady();
    return sortTransactions(await adapter.getAll(STORES.TRANSACTIONS));
  }

  async function snapshot() {
    const [transactions, categories] = await Promise.all([
      adapter.getAll(STORES.TRANSACTIONS),
      adapter.getAll(STORES.CATEGORIES),
    ]);
    return { transactions, categories };
  }

  async function syncMirror() {
    if (!mirror || !mirror.available()) return null;
    const { transactions, categories } = await snapshot();
    if (transactions.length > MIRROR_MAX_ROWS) return { saved: false, reason: 'too-many-rows' };
    return mirror.save(
      buildBackup({ transactions, categories, exportedAt: now() }),
    );
  }

  async function create(input) {
    assertReady();
    const transaction = createTransaction(input, { id: makeId('tx'), now: now() });
    await adapter.put(STORES.TRANSACTIONS, transaction);
    await syncMirror();
    return transaction;
  }

  async function update(id, patch) {
    assertReady();
    const existing = await adapter.get(STORES.TRANSACTIONS, id);
    if (!existing) throw domainError(ERRORS.NOT_FOUND, 'Transaksi tidak ditemukan.');
    if (patch && typeof patch.date === 'string' && isValidISODate(patch.date)) {
      patch = { ...patch, month: monthKeyOf(patch.date) };
    }
    const next = applyPatch(existing, patch, { now: now() });
    await adapter.put(STORES.TRANSACTIONS, next);
    await syncMirror();
    return next;
  }

  async function remove(id) {
    assertReady();
    const existing = await adapter.get(STORES.TRANSACTIONS, id);
    if (!existing) throw domainError(ERRORS.NOT_FOUND, 'Transaksi tidak ditemukan.');
    await adapter.delete(STORES.TRANSACTIONS, id);
    await syncMirror();
    return existing;
  }

  async function listCategories() {
    assertReady();
    const rows = await adapter.getAll(STORES.CATEGORIES);
    return [...rows].sort(
      (a, b) =>
        a.type.localeCompare(b.type) ||
        (a.order ?? 999) - (b.order ?? 999) ||
        a.name.localeCompare(b.name),
    );
  }

  async function addCategory({ name, type, emoji = '🏷️' }) {
    assertReady();
    const cleanName = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
    if (!cleanName) throw domainError(ERRORS.VALIDATION, 'Nama kategori wajib diisi.');
    if (cleanName.length > CATEGORY_NAME_MAX) {
      throw domainError(ERRORS.VALIDATION, `Nama kategori maksimal ${CATEGORY_NAME_MAX} karakter.`);
    }
    if (type !== TYPES.INCOME && type !== TYPES.EXPENSE) {
      throw domainError(ERRORS.VALIDATION, 'Jenis kategori tidak valid.');
    }

    const existing = await adapter.getAll(STORES.CATEGORIES);
    const duplicate = existing.some(
      (category) =>
        category.type === type && category.name.toLowerCase() === cleanName.toLowerCase(),
    );
    if (duplicate) throw domainError(ERRORS.CONFLICT, 'Kategori dengan nama itu sudah ada.');

    const category = {
      id: makeId('cat'),
      name: cleanName,
      type,
      emoji,
      system: false,
      order: 100,
      createdAt: now(),
    };
    await adapter.put(STORES.CATEGORIES, category);
    return category;
  }

  async function removeCategory(id) {
    assertReady();
    const category = await adapter.get(STORES.CATEGORIES, id);
    if (!category) throw domainError(ERRORS.NOT_FOUND, 'Kategori tidak ditemukan.');
    if (category.system) {
      throw domainError(ERRORS.SYSTEM, 'Kategori bawaan tidak bisa dihapus.');
    }
    const used = await adapter.getAllByIndex(STORES.TRANSACTIONS, INDEXES.BY_CATEGORY, id);
    if (used.length > 0) {
      throw domainError(ERRORS.CONFLICT, 'Kategori masih dipakai transaksi.', {
        usedBy: used.length,
      });
    }
    await adapter.delete(STORES.CATEGORIES, id);
    return category;
  }

  async function createMany(inputs = []) {
    assertReady();
    const created = [];
    for (const input of inputs) {
      created.push(createTransaction(input, { id: makeId('tx'), now: now() }));
    }
    await adapter.bulkPut(STORES.TRANSACTIONS, created);
    await syncMirror();
    return created;
  }

  async function exportBackup() {
    const { transactions, categories } = await snapshot();
    const exportedAt = now();
    const payload = buildBackup({ transactions, categories, exportedAt });
    await adapter.put(STORES.META, { key: META_KEYS.LAST_BACKUP_AT, value: exportedAt });
    return payload;
  }

  /**
   * @param {string|object} input teks JSON atau objek cadangan
   * @param {{ mode?: 'merge'|'replace' }} [options]
   */
  async function importBackup(input, options = {}) {
    const mode = options.mode === 'replace' ? 'replace' : 'merge';
    const parsed = typeof input === 'string' ? (() => {
      try {
        return validateBackup(JSON.parse(input));
      } catch {
        return { ok: false, errors: ['Berkas bukan JSON yang valid.'], value: null };
      }
    })() : validateBackup(input);

    if (!parsed.ok) {
      throw domainError(ERRORS.VALIDATION, parsed.errors[0] ?? 'Cadangan tidak valid.', {
        details: parsed.errors,
      });
    }

    const incoming = parsed.value;
    const current = await snapshot();
    const categories = mergeRecords(current.categories, incoming.categories);

    const transactions = mode === 'replace'
      ? { items: incoming.transactions, added: incoming.transactions.length, updated: 0, kept: 0 }
      : mergeRecords(current.transactions, incoming.transactions);

    const validCategoryIds = new Set([...categories.items].map((row) => row.id));
    const orphans = transactions.items.filter((row) => !validCategoryIds.has(row.categoryId));
    if (orphans.length > 0) {
      throw domainError(
        ERRORS.VALIDATION,
        `Ada ${orphans.length} transaksi dengan kategori yang tidak ditemukan di cadangan.`,
      );
    }

    // Hapus transaksi lama hanya setelah cadangan lolos validasi,
    // supaya impor yang gagal tidak menghilangkan data yang sudah ada.
    if (mode === 'replace') await adapter.clear(STORES.TRANSACTIONS);

    await adapter.bulkPut(STORES.CATEGORIES, categories.items);
    await adapter.bulkPut(STORES.TRANSACTIONS, transactions.items);
    await syncMirror();

    return {
      mode,
      transactions: {
        added: transactions.added,
        updated: transactions.updated,
        kept: transactions.kept,
        total: transactions.items.length,
      },
      categories: { added: categories.added, updated: categories.updated, total: categories.items.length },
      exportedAt: incoming.exportedAt,
    };
  }

  async function getMeta(key) {
    const row = await adapter.get(STORES.META, key);
    return row?.value;
  }

  async function setMeta(key, value) {
    await adapter.put(STORES.META, { key, value });
  }

  async function diagnostics() {
    const [transactionCount, categoryCount, schemaVersion, lastBackupAt, deviceId] =
      await Promise.all([
        adapter.count(STORES.TRANSACTIONS),
        adapter.count(STORES.CATEGORIES),
        getMeta(META_KEYS.SCHEMA_VERSION),
        getMeta(META_KEYS.LAST_BACKUP_AT),
        getMeta(META_KEYS.DEVICE_ID),
      ]);

    return {
      transactionCount,
      categoryCount,
      schemaVersion: schemaVersion ?? SCHEMA_VERSION,
      lastBackupAt: lastBackupAt ?? null,
      deviceId: deviceId ?? null,
      adapterKind: adapter.kind ?? 'unknown',
    };
  }

  async function mirrorSnapshot() {
    if (!mirror || !mirror.available()) return null;
    const loaded = mirror.load();
    if (!loaded) return null;
    return loaded;
  }

  return {
    init,
    isReady: () => initialized,
    listByMonth: readMonth,
    listAll: readAll,
    snapshot,
    create,
    createMany,
    update,
    remove,
    listCategories,
    addCategory,
    removeCategory,
    exportBackup,
    importBackup,
    getMeta,
    setMeta,
    diagnostics,
    mirrorSnapshot,
    isTransaction,
  };
}
