/**
 * Adapter in-memory. Dipakai oleh tes dan sebagai fallback bila
 * IndexedDB tidak tersedia (mis. mode privat ketat).
 *
 * Kontraknya identik dengan adapter IndexedDB.
 */

const clone = (value) =>
  typeof globalThis.structuredClone === 'function'
    ? globalThis.structuredClone(value)
    : JSON.parse(JSON.stringify(value));

/**
 * @param {{ indexes?: Record<string, Record<string, (row:object)=>string>> }} [options]
 */
export function createMemoryAdapter(options = {}) {
  const indexes = options.indexes ?? {};
  const stores = new Map();
  const opened = { value: false };

  const table = (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    return stores.get(name);
  };

  return {
    kind: 'memory',

    async open() {
      opened.value = true;
    },

    async close() {
      opened.value = false;
    },

    isOpen() {
      return opened.value;
    },

    async getAll(store) {
      return [...table(store).values()].map(clone);
    },

    async getAllByIndex(store, indexName, value) {
      const extract = indexes[store]?.[indexName];
      const rows = [...table(store).values()];
      if (!extract) throw new Error(`Index ${store}.${indexName} tidak dikenal.`);
      const wanted = new Set([].concat(value).map(String));
      return rows.filter((row) => wanted.has(String(extract(row)))).map(clone);
    },

    async get(store, key) {
      const row = table(store).get(key);
      return row === undefined ? undefined : clone(row);
    },

    async put(store, value) {
      table(store).set(value.id ?? value.key, clone(value));
      return clone(value);
    },

    async bulkPut(store, values) {
      for (const value of values) table(store).set(value.id ?? value.key, clone(value));
      return values.length;
    },

    async delete(store, key) {
      table(store).delete(key);
    },

    async count(store) {
      return table(store).size;
    },

    async clear(store) {
      table(store).clear();
    },
  };
}
