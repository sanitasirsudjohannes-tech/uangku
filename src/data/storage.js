/**
 * Akses ke Storage API browser: persistensi dan estimasi kuota.
 * Satu-satunya berkas di lapisan data yang menyentuh `navigator`.
 */

function storageManager() {
  return globalThis.navigator?.storage ?? null;
}

export function isStorageApiAvailable() {
  return Boolean(storageManager());
}

/**
 * Meminta agar data tidak dihapus otomatis saat penyimpanan menipis.
 * Mengembalikan status akhir ("granted" / "denied" / "unsupported").
 */
export async function requestPersistence() {
  const manager = storageManager();
  if (!manager) return { supported: false, persisted: false, granted: false };

  try {
    if (typeof manager.persisted === 'function') {
      const already = await manager.persisted();
      if (already) return { supported: true, persisted: true, granted: true };
    }
    if (typeof manager.persist !== 'function') {
      return { supported: false, persisted: false, granted: false };
    }
    const granted = await manager.persist();
    return { supported: true, persisted: granted, granted };
  } catch {
    return { supported: true, persisted: false, granted: false };
  }
}

export async function getPersistedStatus() {
  const manager = storageManager();
  if (!manager || typeof manager.persisted !== 'function') {
    return { supported: false, persisted: false };
  }
  try {
    const persisted = await manager.persisted();
    return { supported: true, persisted };
  } catch {
    return { supported: true, persisted: false };
  }
}

/** @returns {{ supported:boolean, usage:number|null, quota:number|null }} */
export async function getStorageEstimate() {
  const manager = storageManager();
  if (!manager || typeof manager.estimate !== 'function') {
    return { supported: false, usage: null, quota: null };
  }
  try {
    const { usage = null, quota = null } = await manager.estimate();
    return { supported: true, usage, quota };
  } catch {
    return { supported: true, usage: null, quota: null };
  }
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1).replace('.', ',')} ${units[index]}`;
}
