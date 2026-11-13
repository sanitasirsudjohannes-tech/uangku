import { monthLabel, monthShortLabel } from '../../core/period.js';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons.jsx';

export default function MonthPicker({ month, onPrev, onNext, onToday, isCurrentMonth, busy }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={onPrev}
        disabled={busy}
        aria-label="Bulan sebelumnya"
        className="btn-quiet h-10 w-10 shrink-0 rounded-full p-0 disabled:opacity-40"
      >
        <ChevronLeftIcon size={20} />
      </button>

      <div className="min-w-0 text-center">
        <p className="truncate text-base font-bold" aria-live="polite">
          {monthLabel(month)}
        </p>
        {!isCurrentMonth && onToday ? (
          <button
            type="button"
            onClick={onToday}
            className="text-xs font-semibold text-brand underline decoration-dotted underline-offset-2"
          >
            Kembali ke {monthShortLabel(month)} ini
          </button>
        ) : (
          <p className="text-xs text-muted">Bulan berjalan</p>
        )}
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={busy}
        aria-label="Bulan berikutnya"
        className="btn-quiet h-10 w-10 shrink-0 rounded-full p-0 disabled:opacity-40"
      >
        <ChevronRightIcon size={20} />
      </button>
    </div>
  );
}
