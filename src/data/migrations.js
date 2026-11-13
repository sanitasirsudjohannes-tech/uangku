/**
 * Migrasi database.
 *
 * Ada dua lapis:
 * 1. Struktur (object store & index) ditangani `applySchema` saat `onupgradeneeded`.
 * 2. Bentuk data ditangani `ensureData` lewat `meta.schemaVersion`.
 */
import {
  DEFAULT_CATEGORIES,
  META_KEYS,
  SCHEMA_VERSION,
  STORES,
  applySchema,
} from './schema.js';

/** Dipakai sebagai `upgrade` adapter IndexedDB. */
export function migrateStructure(db, oldVersion) {
  applySchema(db, oldVersion);
}

/** Dipakai sebagai `upgrade` adapter memory (tanpa struktur nyata). */
export function migrateMemory() {
  /* tidak ada yang perlu dilakukan */
}

/**
 * Memastikan meta, versi skema, dan kategori bawaan tersedia.
 * Aman dipanggil berkali-kali (idempoten).
 */
export async function ensureData(adapter, { now, makeId }) {
  const metaRows = await adapter.getAll(STORES.META);
  const meta = new Map(metaRows.map((row) => [row.key, row.value]));

  const notes = { seededCategories: 0, migratedFrom: null, schemaVersion: SCHEMA_VERSION };

  const storedVersion = Number(meta.get(META_KEYS.SCHEMA_VERSION) ?? 0);
  if (!Number.isInteger(storedVersion) || storedVersion < 1) {
    await adapter.put(STORES.META, { key: META_KEYS.SCHEMA_VERSION, value: SCHEMA_VERSION });
    await adapter.put(STORES.META, { key: META_KEYS.CREATED_AT, value: now });
  } else if (storedVersion < SCHEMA_VERSION) {
    // Tempat migrasi bentuk data antar versi skema berikutnya.
    notes.migratedFrom = storedVersion;
    await adapter.put(STORES.META, { key: META_KEYS.SCHEMA_VERSION, value: SCHEMA_VERSION });
  }

  if (!meta.has(META_KEYS.DEVICE_ID)) {
    await adapter.put(STORES.META, { key: META_KEYS.DEVICE_ID, value: makeId('dev') });
  }

  const categoryCount = await adapter.count(STORES.CATEGORIES);
  if (categoryCount === 0) {
    for (const category of DEFAULT_CATEGORIES) {
      await adapter.put(STORES.CATEGORIES, { ...category, createdAt: now });
    }
    notes.seededCategories = DEFAULT_CATEGORIES.length;
  }

  return notes;
}

export const CURRENT_SCHEMA_VERSION = SCHEMA_VERSION;
