/**
 * Adapter IndexedDB — sumber utama data di perangkat.
 * Semua operasi asinkron dan atomik per transaksi IndexedDB.
 */
import { DB_NAME, DB_VERSION, applySchema } from '../schema.js';

/**
 * @param {{
 *   dbName?: string,
 *   version?: number,
 *   upgrade?: (db: IDBDatabase, oldVersion: number) => void,
 *   factory?: IDBFactory,
 * }} [options]
 */
export function createIdbAdapter(options = {}) {
  const {
    dbName = DB_NAME,
    version = DB_VERSION,
    upgrade = applySchema,
    factory = globalThis.indexedDB,
  } = options;

  /** @type {Promise<IDBDatabase>|null} */
  let dbPromise = null;

  function open() {
    if (!factory) {
      return Promise.reject(new Error('IndexedDB tidak tersedia di lingkungan ini.'));
    }
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      let request;
      try {
        request = factory.open(dbName, version);
      } catch (error) {
        reject(error);
        return;
      }

      request.onupgradeneeded = (event) => {
        try {
          if (typeof upgrade === 'function') upgrade(request.result, event.oldVersion);
        } catch (error) {
          reject(error);
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };

      request.onerror = () => reject(request.error ?? new Error('Gagal membuka database.'));
      request.onblocked = () =>
        reject(new Error('Database sedang dipakai tab lain. Tutup tab lain lalu muat ulang.'));
    });

    return dbPromise;
  }

  /**
   * Menjalankan `run` di dalam satu transaksi.
   * Jika `run` mengembalikan IDBRequest, hasil request dipakai sebagai nilai.
   * Jika tidak, hasilnya undefined (menunggu commit).
   */
  async function withStore(storeName, mode, run) {
    const db = await open();
    return new Promise((resolve, reject) => {
      let outcome;
      let tx;

      try {
        tx = db.transaction(storeName, mode);
      } catch (error) {
        reject(error);
        return;
      }

      try {
        outcome = run(tx.objectStore(storeName));
      } catch (error) {
        try {
          tx.abort();
        } catch {
          /* transaksi mungkin sudah selesai */
        }
        reject(error);
        return;
      }

      tx.oncomplete = () => {
        const isRequest = outcome && typeof outcome === 'object' && 'result' in outcome;
        resolve(isRequest ? outcome.result : undefined);
      };
      tx.onerror = () => reject(tx.error ?? new Error('Transaksi database gagal.'));
      tx.onabort = () => reject(tx.error ?? new Error('Transaksi database dibatalkan.'));
    });
  }

  return {
    kind: 'indexeddb',

    open,

    async close() {
      if (!dbPromise) return;
      const db = await dbPromise;
      db.close();
      dbPromise = null;
    },

    async get(storeName, key) {
      return withStore(storeName, 'readonly', (store) => store.get(key));
    },

    async getAll(storeName) {
      return withStore(storeName, 'readonly', (store) => store.getAll());
    },

    async getAllByIndex(storeName, indexName, value) {
      return withStore(storeName, 'readonly', (store) => store.index(indexName).getAll(value));
    },

    async put(storeName, value) {
      await withStore(storeName, 'readwrite', (store) => store.put(value));
      return value;
    },

    async bulkPut(storeName, values) {
      if (!values.length) return 0;
      await withStore(storeName, 'readwrite', (store) => {
        for (const value of values) store.put(value);
        return undefined;
      });
      return values.length;
    },

    async delete(storeName, key) {
      return withStore(storeName, 'readwrite', (store) => store.delete(key));
    },

    async count(storeName) {
      return withStore(storeName, 'readonly', (store) => store.count());
    },

    async clear(storeName) {
      return withStore(storeName, 'readwrite', (store) => store.clear());
    },
  };
}
