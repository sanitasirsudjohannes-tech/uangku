/** Utilitas tampilan tingkat UI (bukan logika bisnis). */

export function formatDateTime(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 16).replace('T', ' ');
  }
}

export function daysSince(iso) {
  if (!iso) return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;
  return Math.floor((Date.now() - then.getTime()) / 86_400_000);
}

export function backupReminder(lastBackupAt) {
  const days = daysSince(lastBackupAt);
  if (days === null) return { level: 'warn', text: 'Belum pernah backup' };
  if (days <= 0) return { level: 'ok', text: 'Backup hari ini' };
  if (days < 7) return { level: 'ok', text: `Backup ${days} hari lalu` };
  if (days < 30) return { level: 'warn', text: `Sudah ${days} hari tanpa backup` };
  return { level: 'danger', text: `Sudah ${days} hari tanpa backup` };
}

export function shortId(id) {
  if (!id) return '—';
  const text = String(id);
  return text.length > 14 ? `${text.slice(0, 14)}…` : text;
}

/** Memicu unduhan berkas teks di browser. */
export function downloadText(filename, text, mime = 'application/json') {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
