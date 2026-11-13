import { formatRupiah } from '../../core/currency.js';
import { monthLabel } from '../../core/period.js';

function comparisonText(current, previous, changePercent) {
  if (!previous) return null;

  if (previous.expense === 0 && current.expense === 0) {
    return 'Tidak ada pengeluaran tercatat pada bulan ini maupun bulan sebelumnya.';
  }
  if (previous.expense === 0) {
    return 'Bulan sebelumnya belum memiliki pengeluaran tercatat.';
  }

  const difference = current.expense - previous.expense;
  if (difference === 0) {
    return `Sama dengan ${monthLabel(previous.month)}.`;
  }

  const direction = difference > 0 ? 'naik' : 'turun';
  const percentage = changePercent == null
    ? ''
    : ` (${Math.abs(changePercent).toLocaleString('id-ID')}%)`;

  return `${direction.charAt(0).toUpperCase() + direction.slice(1)} ${formatRupiah(Math.abs(difference))}${percentage} dibanding ${monthLabel(previous.month)}.`;
}

export default function AnalyticsMonthlyExpense({ current, previous, changePercent }) {
  if (!current) return null;

  const comparison = comparisonText(current, previous, changePercent);

  return (
    <section className="mb-4" aria-labelledby="monthly-expense-title">
      <div className="card border border-expense/20 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="monthly-expense-title" className="text-xs font-bold uppercase tracking-wider text-muted">
              Pengeluaran bulanan
            </h2>
            <p className="mt-1 text-xs text-muted">{monthLabel(current.month)}</p>
          </div>
          <span aria-hidden="true" className="text-xl">🧾</span>
        </div>

        <p className="tabular mt-2 text-2xl font-extrabold tracking-tight text-expense">
          {formatRupiah(current.expense)}
        </p>
        <p className="mt-1 text-xs text-muted">Total seluruh transaksi keluar pada bulan terpilih.</p>

        {comparison ? (
          <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-muted" aria-live="polite">
            {comparison}
          </p>
        ) : null}
      </div>
    </section>
  );
}
