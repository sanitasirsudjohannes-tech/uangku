/**
 * Definisi skema database. Satu sumber kebenaran untuk nama store,
 * index, dan kategori bawaan.
 */

export const DB_NAME = 'uangku';
export const DB_VERSION = 1;
export const SCHEMA_VERSION = 1;
export const APP_ID = 'uangku';

export const STORES = Object.freeze({
  TRANSACTIONS: 'transactions',
  CATEGORIES: 'categories',
  META: 'meta',
});

export const INDEXES = Object.freeze({
  BY_MONTH: 'by_month',
  BY_CATEGORY: 'by_category',
  BY_DATE: 'by_date',
});

/** Nama field yang dipakai tiap index (dipakai juga oleh adapter memory). */
export const INDEX_FIELDS = Object.freeze({
  [INDEXES.BY_MONTH]: 'month',
  [INDEXES.BY_CATEGORY]: 'categoryId',
  [INDEXES.BY_DATE]: 'date',
});

export const META_KEYS = Object.freeze({
  SCHEMA_VERSION: 'schemaVersion',
  DEVICE_ID: 'deviceId',
  LAST_BACKUP_AT: 'lastBackupAt',
  CREATED_AT: 'createdAt',
});

/** Kategori bawaan. `system: true` berarti tidak boleh dihapus. */
export const DEFAULT_CATEGORIES = Object.freeze([
  { id: 'cat_makanan', name: 'Makanan', type: 'expense', emoji: '🍚', system: true, order: 10 },
  { id: 'cat_transport', name: 'Transportasi', type: 'expense', emoji: '🛵', system: true, order: 20 },
  { id: 'cat_belanja', name: 'Belanja', type: 'expense', emoji: '🛒', system: true, order: 30 },
  { id: 'cat_tagihan', name: 'Tagihan', type: 'expense', emoji: '🧾', system: true, order: 40 },
  { id: 'cat_kesehatan', name: 'Kesehatan', type: 'expense', emoji: '💊', system: true, order: 50 },
  { id: 'cat_hiburan', name: 'Hiburan', type: 'expense', emoji: '🎬', system: true, order: 60 },
  { id: 'cat_lain_expense', name: 'Lainnya', type: 'expense', emoji: '📦', system: true, order: 70 },
  { id: 'cat_gaji', name: 'Gaji', type: 'income', emoji: '💼', system: true, order: 10 },
  { id: 'cat_bonus', name: 'Bonus', type: 'income', emoji: '🎁', system: true, order: 20 },
  { id: 'cat_usaha', name: 'Usaha', type: 'income', emoji: '🏪', system: true, order: 30 },
  { id: 'cat_lain_income', name: 'Lainnya', type: 'income', emoji: '📦', system: true, order: 40 },
]);

/** Membuat object store + index saat database dibuat atau di-upgrade. */
export function applySchema(db) {
  const has = (name) => db.objectStoreNames.contains(name);

  if (!has(STORES.TRANSACTIONS)) {
    const store = db.createObjectStore(STORES.TRANSACTIONS, { keyPath: 'id' });
    store.createIndex(INDEXES.BY_MONTH, INDEX_FIELDS[INDEXES.BY_MONTH], { unique: false });
    store.createIndex(INDEXES.BY_CATEGORY, INDEX_FIELDS[INDEXES.BY_CATEGORY], { unique: false });
    store.createIndex(INDEXES.BY_DATE, INDEX_FIELDS[INDEXES.BY_DATE], { unique: false });
  }

  if (!has(STORES.CATEGORIES)) {
    db.createObjectStore(STORES.CATEGORIES, { keyPath: 'id' });
  }

  if (!has(STORES.META)) {
    db.createObjectStore(STORES.META, { keyPath: 'key' });
  }
}
