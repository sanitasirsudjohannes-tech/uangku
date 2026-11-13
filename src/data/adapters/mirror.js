/**
 * Cermin cadangan di localStorage.
 * Bukan database utama — hanya jaring pengaman bila IndexedDB
 * terhapus (mis. membersihkan data situs) atau gagal dibuka.
 */
export const MIRROR_KEY = 'uangku:mirror:v1';
export const DEFAULT_MAX_BYTES = 1_000_000;

/**
 * @param {{ storage?: Storage|null, key?: string, maxBytes?: number }} [options]
 */
export function createMirror(options = {}) {
  const {
    storage = typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage,
    key = MIRROR_KEY,
    maxBytes = DEFAULT_MAX_BYTES,
  } = options;

  let lastSize = 0;
  let lastSavedAt = null;
  let skipped = false;

  function available() {
    return Boolean(storage);
  }

  async function save(snapshot) {
    if (!storage) return { saved: false, reason: 'unavailable' };
    let text;
    try {
      text = JSON.stringify(snapshot);
    } catch {
      return { saved: false, reason: 'serialize' };
    }

    lastSize = text.length;
    if (text.length > maxBytes) {
      skipped = true;
      return { saved: false, reason: 'too-large', bytes: text.length };
    }

    try {
      storage.setItem(key, text);
      skipped = false;
      lastSavedAt = snapshot?.exportedAt ?? null;
      return { saved: true, bytes: text.length };
    } catch {
      skipped = true;
      return { saved: false, reason: 'quota' };
    }
  }

  function load() {
    if (!storage) return null;
    try {
      const text = storage.getItem(key);
      if (!text) return null;
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  function clear() {
    if (!storage) return;
    try {
      storage.removeItem(key);
    } catch {
      /* abaikan */
    }
  }

  return {
    available,
    save,
    load,
    clear,
    status: () => ({ available: available(), lastSize, lastSavedAt, skipped }),
  };
}
