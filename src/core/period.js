/**
 * Utilitas periode dan tanggal. Tanggal selalu berupa string ISO
 * "YYYY-MM-DD" dan kunci bulan "YYYY-MM" agar tidak bergantung zona waktu.
 */

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_KEY = /^(\d{4})-(\d{2})$/;

export function pad2(value) {
  return String(value).padStart(2, '0');
}

/** 2026, 11, 5 -> "2026-11-05" (bulan 1-12) */
export function toISODate(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Tanggal lokal perangkat -> "YYYY-MM-DD" */
export function dateToISO(date) {
  return toISODate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function isValidISODate(value) {
  const match = ISO_DATE.exec(String(value ?? ''));
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

/** "2026-11-05" -> { year, month, day } atau null */
export function parseISODate(value) {
  if (!isValidISODate(value)) return null;
  const [year, month, day] = String(value).split('-').map(Number);
  return { year, month, day };
}

export function isValidMonthKey(value) {
  const match = MONTH_KEY.exec(String(value ?? ''));
  if (!match) return false;
  const month = Number(match[2]);
  return month >= 1 && month <= 12;
}

/** "2026-11-05" -> "2026-11" */
export function monthKeyOf(isoDate) {
  return String(isoDate ?? '').slice(0, 7);
}

/** Date -> "2026-11" */
export function monthKeyFromDate(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

/** "2026-11", -1 -> "2026-10" */
export function addMonths(monthKey, delta) {
  if (!isValidMonthKey(monthKey)) return monthKey;
  const [year, month] = monthKey.split('-').map(Number);
  const total = year * 12 + (month - 1) + Math.trunc(delta);
  const nextYear = Math.floor(total / 12);
  const nextMonth = ((total % 12) + 12) % 12;
  return `${nextYear}-${pad2(nextMonth + 1)}`;
}

export function compareMonths(a, b) {
  return String(a).localeCompare(String(b));
}

/** "2026-11" -> "November 2026" */
export function monthLabel(monthKey) {
  if (!isValidMonthKey(monthKey)) return String(monthKey ?? '');
  const [year, month] = monthKey.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** "2026-11" -> "Nov 2026" */
export function monthShortLabel(monthKey) {
  if (!isValidMonthKey(monthKey)) return String(monthKey ?? '');
  const [year, month] = monthKey.split('-').map(Number);
  return `${MONTH_SHORT[month - 1]} ${year}`;
}

/** "2026-11-05" -> "5 November 2026" */
export function formatDateLong(isoDate) {
  const parts = parseISODate(isoDate);
  if (!parts) return String(isoDate ?? '');
  return `${parts.day} ${MONTH_NAMES[parts.month - 1]} ${parts.year}`;
}

/** "2026-11-05" -> "Kamis" */
export function dayName(isoDate) {
  const parts = parseISODate(isoDate);
  if (!parts) return '';
  return DAY_NAMES[new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay()];
}

/** Label ramah untuk header grup: "Hari ini", "Kemarin", atau "5 Nov 2026" */
export function relativeDayLabel(isoDate, todayISO) {
  if (!isValidISODate(isoDate)) return String(isoDate ?? '');
  if (isoDate === todayISO) return 'Hari ini';
  const parts = parseISODate(isoDate);
  const today = parseISODate(todayISO);
  if (parts && today) {
    const diff = Math.round(
      (Date.UTC(today.year, today.month - 1, today.day) -
        Date.UTC(parts.year, parts.month - 1, parts.day)) /
        86400000,
    );
    if (diff === 1) return 'Kemarin';
  }
  const monthShort = MONTH_SHORT[(parts?.month ?? 1) - 1];
  return `${parts?.day} ${monthShort} ${parts?.year}`;
}

/** Rentang tanggal inklusif untuk satu bulan. */
export function monthBounds(monthKey) {
  if (!isValidMonthKey(monthKey)) return null;
  const [year, month] = monthKey.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { start: `${monthKey}-01`, end: `${monthKey}-${pad2(lastDay)}` };
}

export function isInMonth(isoDate, monthKey) {
  return monthKeyOf(isoDate) === monthKey;
}
