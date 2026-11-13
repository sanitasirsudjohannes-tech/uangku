/**
 * Pembuat id. Disuntikkan ke repository supaya tes bisa deterministik.
 */
export function makeId(prefix = 'id') {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return `${prefix}_${cryptoObj.randomUUID()}`;
  }
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${time}${random}`;
}

/** Clock default: ISO timestamp UTC. */
export function nowISO() {
  return new Date().toISOString();
}

/** Clock untuk tanggal lokal "YYYY-MM-DD". */
export function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
