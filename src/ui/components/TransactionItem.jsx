import { formatRupiah } from '../../core/currency.js';
import { relativeDayLabel } from '../../core/period.js';

export default function TransactionItem({ transaction, category, onClick, showDate = false, today }) {
  const isIncome = transaction.type === 'income';
  const name = category?.name ?? 'Tanpa kategori';
  const emoji = category?.emoji ?? '🏷️';

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-surface-2"
    >
      <span
        aria-hidden="true"
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
          isIncome ? 'bg-income-soft' : 'bg-surface-2'
        }`}
      >
        {emoji}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-1.5">
          <span className="truncate text-sm font-semibold">{name}</span>
          {showDate ? (
            <span className="shrink-0 text-[0.7rem] text-muted">
              {relativeDayLabel(transaction.date, today)}
            </span>
          ) : null}
        </span>
        {transaction.note ? (
          <span className="mt-0.5 block truncate text-xs text-muted">{transaction.note}</span>
        ) : null}
      </span>

      <span
        className={`tabular shrink-0 text-sm font-bold ${
          isIncome ? 'amount-income' : 'amount-expense'
        }`}
      >
        {isIncome ? '+' : '−'}
        {formatRupiah(transaction.amount)}
      </span>
    </button>
  );
}
