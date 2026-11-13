/**
 * Format dan penguraian nominal Rupiah.
 * Semua nominal di aplikasi ini adalah integer (tanpa desimal) untuk
 * menghindari galat pembulatan.
 */

const GROUPER = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

/** Batas atas wajar: seribu triliun rupiah. */
export const MAX_AMOUNT = 1_000_000_000_000_000;

export function isIntegerRupiah(value) {
  return Number.isInteger(value) && value > 0 && value <= MAX_AMOUNT;
}

/** "1500000" -> "1.500.000" */
export function groupDigits(value) {
  const n = Number.isFinite(value) ? Math.trunc(Math.abs(value)) : 0;
  return GROUPER.format(n);
}

/** 1500000 -> "Rp1.500.000" */
export function formatRupiah(value) {
  const safe = Number.isFinite(value) ? Math.trunc(value) : 0;
  const sign = safe < 0 ? '-' : '';
  return `${sign}Rp${groupDigits(safe)}`;
}

/** 1500000 -> "+Rp1.500.000", -20000 -> "−Rp20.000" */
export function formatRupiahSigned(value) {
  const safe = Number.isFinite(value) ? Math.trunc(value) : 0;
  if (safe === 0) return formatRupiah(0);
  return safe > 0 ? `+${formatRupiah(safe)}` : `−${formatRupiah(Math.abs(safe))}`;
}

/** Bentuk ringkas untuk kartu sempit: 1250000 -> "1,3 jt" */
export function formatRupiahCompact(value) {
  const safe = Math.abs(Number.isFinite(value) ? Math.trunc(value) : 0);
  if (safe < 1_000) return `${formatRupiah(safe)}`;
  const units = [
    { limit: 1_000_000_000_000, suffix: ' T' },
    { limit: 1_000_000_000, suffix: ' M' },
    { limit: 1_000_000, suffix: ' jt' },
    { limit: 1_000, suffix: ' rb' },
  ];
  for (const { limit, suffix } of units) {
    if (safe >= limit) {
      const scaled = safe / limit;
      const text = scaled >= 100 ? Math.round(scaled).toString() : scaled.toFixed(1).replace('.', ',');
      return `Rp${text.replace(',0', '')}${suffix}`;
    }
  }
  return formatRupiah(safe);
}

/**
 * Mengubah ketikan pengguna menjadi integer rupiah.
 * Titik dan koma diperlakukan sebagai pemisah ribuan sehingga
 * "1.500.000", "1500000", dan "1,500,000" menghasilkan angka yang sama.
 * Mengembalikan null jika tidak ada digit sama sekali.
 */
export function parseRupiah(input) {
  if (typeof input === 'number') {
    return Number.isFinite(input) ? Math.trunc(Math.abs(input)) : null;
  }
  if (typeof input !== 'string') return null;

  const minus = input.trim().startsWith('-');
  const digits = input.replace(/[^\d]/g, '');
  if (!digits) return null;

  const value = Number.parseInt(digits, 10);
  if (!Number.isSafeInteger(value)) return null;
  return minus ? -value : value;
}

/** Menormalkan ketikan menjadi teks bergrup: "1.500.0" -> "1.500.0" */
export function formatAmountInput(digits) {
  const clean = String(digits ?? '').replace(/[^\d]/g, '');
  if (!clean) return '';
  const normalized = clean.replace(/^0+(?=\d)/, '');
  return groupDigits(Number.parseInt(normalized, 10));
}
