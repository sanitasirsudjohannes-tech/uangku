/**
 * Selector murni: state -> data siap tampil.
 * Tidak menyimpan cache; perhitungannya ringan karena transaksi
 * yang dimuat hanya satu bulan.
 */
import { paginate } from '../core/summary.js';
import { TYPES } from '../core/transaction.js';

export const HISTORY_PAGE_SIZE = 50;

export function selectCategoryMap(state) {
  return new Map(state.categories.map((category) => [category.id, category]));
}

export function selectCategoriesByType(state, type) {
  return state.categories.filter((category) => category.type === type);
}

export function selectCategory(state, categoryId) {
  return state.categories.find((category) => category.id === categoryId) ?? null;
}

export function selectRecent(state, limit = 5) {
  return state.transactions.slice(0, limit);
}

/** Kategori teratas untuk donut sederhana di Ringkasan. */
export function selectTopCategories(state, limit = 4) {
  const map = selectCategoryMap(state);
  return state.breakdown.slice(0, limit).map((row) => ({
    ...row,
    name: map.get(row.categoryId)?.name ?? 'Tanpa kategori',
    emoji: map.get(row.categoryId)?.emoji ?? '🏷️',
  }));
}

export function selectHistory(state, size = HISTORY_PAGE_SIZE) {
  const page = state.historyPage ?? 1;
  return paginate(state.transactions, page, size);
}

export function selectIncomeCategories(state) {
  return selectCategoriesByType(state, TYPES.INCOME);
}

export function selectExpenseCategories(state) {
  return selectCategoriesByType(state, TYPES.EXPENSE);
}

export function selectIsEmptyMonth(state) {
  return state.ready && state.transactions.length === 0;
}
