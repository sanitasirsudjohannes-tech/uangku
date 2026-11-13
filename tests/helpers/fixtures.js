import { createMemoryAdapter } from '../../src/data/adapters/memory.js';
import { createRepository } from '../../src/data/repository.js';
import { INDEX_FIELDS, INDEXES, STORES } from '../../src/data/schema.js';

/** Adapter memory dengan index yang meniru IndexedDB. */
export function memoryAdapter() {
  return createMemoryAdapter({
    indexes: {
      [STORES.TRANSACTIONS]: {
        [INDEXES.BY_MONTH]: (row) => row[INDEX_FIELDS[INDEXES.BY_MONTH]],
        [INDEXES.BY_CATEGORY]: (row) => row[INDEX_FIELDS[INDEXES.BY_CATEGORY]],
        [INDEXES.BY_DATE]: (row) => row[INDEX_FIELDS[INDEXES.BY_DATE]],
      },
    },
  });
}

/** Clock palsu yang bertambah satu detik tiap pemanggilan. */
export function fakeClock(start = '2026-11-13T08:00:00.000Z') {
  let tick = 0;
  const base = new Date(start).getTime();
  return () => new Date(base + tick++ * 1000).toISOString();
}

/** Id deterministik: tx_1, tx_2, ... */
export function sequentialId() {
  let counter = 0;
  return (prefix = 'id') => `${prefix}_${++counter}`;
}

export function makeRepo(overrides = {}) {
  return createRepository({
    adapter: memoryAdapter(),
    makeId: sequentialId(),
    now: fakeClock(),
    ...overrides,
  });
}

export const baseExpense = {
  type: 'expense',
  amount: 25000,
  categoryId: 'cat_makanan',
  note: 'Makan siang',
  date: '2026-11-13',
};

export const baseIncome = {
  type: 'income',
  amount: 500000,
  categoryId: 'cat_gaji',
  note: 'Gaji bulanan',
  date: '2026-11-01',
};
