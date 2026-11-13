import { formatRupiahCompact } from '../../core/currency.js';
import { monthShortLabel } from '../../core/period.js';

export default function AnalyticsTrend({ rows = [] }) {
  const maximum = Math.max(
    1,
    ...rows.flatMap((row) => [row.income, row.expense]),
  );

  return (
    <section className="mb-4">
      <h2 className="section-title">Tren pemasukan dan pengeluaran</h2>
      <div className="card px-3.5 py-4">
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.68rem] font-semibold text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-income" /> Pemasukan
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-expense" /> Pengeluaran
          </span>
        </div>

        <div className="flex h-36 items-end justify-between gap-1.5">
          {rows.map((row) => {
            const incomeHeight = row.income > 0 ? Math.max(3, (row.income / maximum) * 100) : 0;
            const expenseHeight = row.expense > 0 ? Math.max(3, (row.expense / maximum) * 100) : 0;
            return (
              <div key={row.month} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                <div className="flex h-28 w-full items-end justify-center gap-1">
                  <div
                    aria-label={`Pemasukan ${formatRupiahCompact(row.income)}`}
                    title={`Pemasukan: ${formatRupiahCompact(row.income)}`}
                    className="w-3 rounded-t-sm bg-income transition-[height]"
                    style={{ height: `${incomeHeight}%` }}
                  />
                  <div
                    aria-label={`Pengeluaran ${formatRupiahCompact(row.expense)}`}
                    title={`Pengeluaran: ${formatRupiahCompact(row.expense)}`}
                    className="w-3 rounded-t-sm bg-expense transition-[height]"
                    style={{ height: `${expenseHeight}%` }}
                  />
                </div>
                <span className="w-full truncate text-center text-[0.58rem] font-medium text-muted">
                  {monthShortLabel(row.month)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
