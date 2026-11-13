/**
 * Ekspor/impor cadangan JSON.
 * Semua fungsi di sini murni kecuali `parseBackup` yang mem-parse teks.
 */
import { APP_ID, SCHEMA_VERSION } from './schema.js';
import { isValidISODate } from '../core/period.js';
import { isTransaction, TYPES } from '../core/transaction.js';

const CATEGORY_NAME_MAX = 24;

export function buildBackup({ transactions = [], categories = [], exportedAt }) {
  const at = exportedAt ?? null;
  return {
    app: APP_ID,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: at,
    counts: { transactions: transactions.length, categories: categories.length },
    transactions,
    categories,
  };
}

export function backupFileName(exportedAt) {
  const stamp = String(exportedAt ?? '').slice(0, 10) || 'tanpa-tanggal';
  return `uangku-backup-${stamp}.json`;
}

/**
 * Validasi menyeluruh sebelum data asing masuk ke database.
 * @returns {{ ok:boolean, errors:string[], value:object|null }}
 */
export function validateBackup(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, errors: ['Berkas bukan objek JSON yang valid.'], value: null };
  }
  if (payload.app !== APP_ID) {
    errors.push('Berkas ini bukan cadangan aplikasi Uangku.');
  }

  const version = Number(payload.schemaVersion);
  if (!Number.isInteger(version) || version < 1) {
    errors.push('Versi skema cadangan tidak dikenali.');
  } else if (version > SCHEMA_VERSION) {
    errors.push(
      `Cadangan dibuat oleh versi aplikasi yang lebih baru (skema ${version}). Perbarui aplikasi dulu.`,
    );
  }

  if (!Array.isArray(payload.transactions)) {
    errors.push('Daftar transaksi tidak ditemukan.');
  }
  if (!Array.isArray(payload.categories)) {
    errors.push('Daftar kategori tidak ditemukan.');
  }
  if (errors.length) return { ok: false, errors, value: null };

  const seen = new Set();
  const transactions = [];
  payload.transactions.forEach((row, index) => {
    if (!isTransaction(row)) {
      errors.push(`Transaksi #${index + 1} tidak valid.`);
      return;
    }
    if (seen.has(row.id)) {
      errors.push(`Transaksi #${index + 1} memiliki id ganda (${row.id}).`);
      return;
    }
    seen.add(row.id);
    transactions.push({
      id: row.id,
      type: row.type,
      amount: row.amount,
      categoryId: row.categoryId,
      note: typeof row.note === 'string' ? row.note.slice(0, 200) : '',
      date: row.date,
      month: String(row.month ?? row.date.slice(0, 7)),
      createdAt: String(row.createdAt ?? `${row.date}T00:00:00.000Z`),
      updatedAt: String(row.updatedAt ?? row.createdAt ?? `${row.date}T00:00:00.000Z`),
    });
  });

  const categories = [];
  const seenCategories = new Set();
  payload.categories.forEach((row, index) => {
    const valid =
      row &&
      typeof row.id === 'string' &&
      row.id &&
      typeof row.name === 'string' &&
      row.name.trim() &&
      (row.type === TYPES.INCOME || row.type === TYPES.EXPENSE);
    if (!valid) {
      errors.push(`Kategori #${index + 1} tidak valid.`);
      return;
    }
    if (seenCategories.has(row.id)) return;
    seenCategories.add(row.id);
    categories.push({
      id: row.id,
      name: row.name.trim().slice(0, CATEGORY_NAME_MAX),
      type: row.type,
      emoji: typeof row.emoji === 'string' ? row.emoji.slice(0, 8) : '🏷️',
      system: Boolean(row.system),
      order: Number.isFinite(row.order) ? row.order : 999,
      createdAt: isValidISODate(row.createdAt) ? row.createdAt : null,
    });
  });

  if (errors.length) return { ok: false, errors, value: null };

  return {
    ok: true,
    errors: [],
    value: {
      app: APP_ID,
      schemaVersion: version,
      exportedAt: payload.exportedAt ?? null,
      transactions,
      categories,
    },
  };
}

export function parseBackup(text) {
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['Berkas bukan JSON yang valid.'], value: null };
  }
  return validateBackup(payload);
}

/**
 * Menggabungkan dua daftar record berdasarkan id.
 * Record yang lebih baru (updatedAt) menang; record baru ditambahkan.
 */
export function mergeRecords(current = [], incoming = []) {
  const byId = new Map();
  for (const row of current) byId.set(row.id, row);

  let added = 0;
  let updated = 0;
  let kept = 0;

  for (const row of incoming) {
    const existing = byId.get(row.id);
    if (!existing) {
      byId.set(row.id, row);
      added += 1;
      continue;
    }
    const existingStamp = String(existing.updatedAt ?? '');
    const incomingStamp = String(row.updatedAt ?? '');
    if (incomingStamp > existingStamp) {
      byId.set(row.id, row);
      updated += 1;
    } else {
      kept += 1;
    }
  }

  return { items: [...byId.values()], added, updated, kept };
}
