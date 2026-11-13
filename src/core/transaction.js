/**
 * Entitas transaksi + aturan validasinya.
 * Tidak menyentuh DOM, storage, atau jam sistem — semuanya disuntikkan
 * dari luar supaya bisa diuji secara deterministik.
 */
import { isIntegerRupiah } from './currency.js';
import { isValidISODate, monthKeyOf } from './period.js';

export const TYPES = Object.freeze({ INCOME: 'income', EXPENSE: 'expense' });

export const TYPE_LABEL = Object.freeze({
  income: 'Pemasukan',
  expense: 'Pengeluaran',
});

export const NOTE_MAX = 200;

const EDITABLE_FIELDS = ['type', 'amount', 'categoryId', 'note', 'date'];

/**
 * Memvalidasi input mentah dari form.
 * @returns {{ ok: boolean, errors: Record<string,string>, value: object }}
 */
export function validateTransactionInput(input = {}) {
  const errors = {};

  const type = input.type;
  if (type !== TYPES.INCOME && type !== TYPES.EXPENSE) {
    errors.type = 'Jenis transaksi tidak dikenal.';
  }

  const amount =
    typeof input.amount === 'string' ? Number.parseInt(input.amount, 10) : input.amount;
  if (!isIntegerRupiah(amount)) {
    errors.amount = amount === 0 || amount === null || amount === undefined
      ? 'Nominal wajib diisi.'
      : 'Nominal harus bilangan bulat lebih dari nol.';
  }

  const categoryId = typeof input.categoryId === 'string' ? input.categoryId.trim() : '';
  if (!categoryId) {
    errors.categoryId = 'Kategori wajib dipilih.';
  }

  const date = typeof input.date === 'string' ? input.date.trim() : '';
  if (!isValidISODate(date)) {
    errors.date = 'Tanggal tidak valid (format YYYY-MM-DD).';
  }

  const rawNote = typeof input.note === 'string' ? input.note : '';
  const note = rawNote.trim().replace(/\s+/g, ' ');
  if (note.length > NOTE_MAX) {
    errors.note = `Catatan maksimal ${NOTE_MAX} karakter.`;
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: {
      type,
      amount,
      categoryId,
      note,
      date,
      month: isValidISODate(date) ? monthKeyOf(date) : null,
    },
  };
}

/**
 * Membuat transaksi baru yang sudah tervalidasi.
 * @param {object} input
 * @param {{ id: string, now: string }} meta
 */
export function createTransaction(input, meta = {}) {
  const { id, now } = meta;
  if (typeof id !== 'string' || !id) {
    throw new TypeError('createTransaction membutuhkan id dari pemanggil.');
  }
  if (typeof now !== 'string' || !now) {
    throw new TypeError('createTransaction membutuhkan timestamp now dari pemanggil.');
  }

  const result = validateTransactionInput(input);
  if (!result.ok) {
    const error = new Error('Data transaksi tidak valid.');
    error.name = 'ValidationError';
    error.errors = result.errors;
    throw error;
  }

  return freezeTransaction({
    id,
    ...result.value,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Menerapkan perubahan sebagian pada transaksi yang sudah ada.
 */
export function applyPatch(transaction, patch = {}, meta = {}) {
  if (!transaction || typeof transaction !== 'object') {
    throw new TypeError('applyPatch membutuhkan transaksi yang valid.');
  }
  const now = meta.now;
  if (typeof now !== 'string' || !now) {
    throw new TypeError('applyPatch membutuhkan timestamp now dari pemanggil.');
  }

  const merged = { ...transaction };
  for (const field of EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(patch, field)) {
      merged[field] = patch[field];
    }
  }

  const result = validateTransactionInput(merged);
  if (!result.ok) {
    const error = new Error('Perubahan transaksi tidak valid.');
    error.name = 'ValidationError';
    error.errors = result.errors;
    throw error;
  }

  return freezeTransaction({
    ...transaction,
    ...result.value,
    updatedAt: now,
  });
}

function freezeTransaction(record) {
  return Object.freeze({
    id: record.id,
    type: record.type,
    amount: record.amount,
    categoryId: record.categoryId,
    note: record.note,
    date: record.date,
    month: record.month ?? monthKeyOf(record.date),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

/** Urutkan: tanggal terbaru dulu, lalu catatan terbaru, lalu id (stabil). */
export function sortTransactions(list) {
  return [...list].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    return String(a.id).localeCompare(String(b.id));
  });
}

export function isTransaction(value) {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    (value.type === TYPES.INCOME || value.type === TYPES.EXPENSE) &&
    isIntegerRupiah(value.amount) &&
    typeof value.categoryId === 'string' &&
    isValidISODate(value.date)
  );
}
