/**
 * Agregasi murni atas daftar transaksi.
 */
import { TYPES } from './transaction.js';

/** @returns {{ income:number, expense:number, balance:number, count:number }} */
export function summarize(list = []) {
  let income = 0;
  let expense = 0;
  for (const item of list) {
    if (item.type === TYPES.INCOME) income += item.amount;
    else if (item.type === TYPES.EXPENSE) expense += item.amount;
  }
  return { income, expense, balance: income - expense, count: list.length };
}

/**
 * Total per kategori, terbesar dulu.
 * @returns {Array<{ categoryId:string, type:string, total:number, count:number }>}
 */
export function byCategory(list = []) {
  const bucket = new Map();
  for (const item of list) {
    const key = `${item.type}:${item.categoryId}`;
    const current = bucket.get(key) ?? {
      categoryId: item.categoryId,
      type: item.type,
      total: 0,
      count: 0,
    };
    current.total += item.amount;
    current.count += 1;
    bucket.set(key, current);
  }
  return [...bucket.values()].sort((a, b) => b.total - a.total || b.count - a.count);
}

/**
 * Kelompokkan per tanggal (terbaru dulu) beserta subtotal harian.
 * @returns {Array<{ date:string, items:Array, income:number, expense:number, net:number }>}
 */
export function groupByDate(list = []) {
  const bucket = new Map();
  for (const item of list) {
    const group = bucket.get(item.date) ?? { date: item.date, items: [], income: 0, expense: 0 };
    group.items.push(item);
    if (item.type === TYPES.INCOME) group.income += item.amount;
    else group.expense += item.amount;
    bucket.set(item.date, group);
  }
  return [...bucket.values()]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .map((group) => ({ ...group, net: group.income - group.expense }));
}

/** Potong daftar menjadi satu halaman (1-based). */
export function paginate(list = [], page = 1, size = 50) {
  const safeSize = Math.max(1, Math.trunc(size));
  const totalPages = Math.max(1, Math.ceil(list.length / safeSize));
  const safePage = Math.min(Math.max(1, Math.trunc(page) || 1), totalPages);
  const start = (safePage - 1) * safeSize;
  return {
    items: list.slice(start, start + safeSize),
    page: safePage,
    pageCount: totalPages,
    total: list.length,
    hasPrev: safePage > 1,
    hasNext: safePage < totalPages,
  };
}

/** Tren bulanan untuk daftar transaksi lintas bulan. */
export function monthlyTrend(list = []) {
  const bucket = new Map();
  for (const item of list) {
    const key = item.month ?? item.date?.slice(0, 7);
    if (!key) continue;
    const row = bucket.get(key) ?? { month: key, income: 0, expense: 0, net: 0 };
    if (item.type === TYPES.INCOME) row.income += item.amount;
    else row.expense += item.amount;
    row.net = row.income - row.expense;
    bucket.set(key, row);
  }
  return [...bucket.values()].sort((a, b) => a.month.localeCompare(b.month));
}
