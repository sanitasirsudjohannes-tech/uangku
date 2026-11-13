import { useApp, useAppState } from '../context.jsx';
import MonthPicker from '../components/MonthPicker.jsx';
import TransactionItem from '../components/TransactionItem.jsx';
import { selectHistory } from '../../app/selectors.js';
import { groupByDate } from '../../core/summary.js';
import { formatRupiah } from '../../core/currency.js';
import { monthKeyOf, relativeDayLabel } from '../../core/period.js';
import { PlusIcon } from '../components/Icons.jsx';

export default function HistoryView() {
  const { actions, openForm } = useApp();
  const state = useAppState();
  const { month, today, categories, busy, historyPage } = state;
  const isCurrentMonth = month === monthKeyOf(today);

  const page = selectHistory(state);
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const groups = groupByDate(page.items);

  return (
    <div className="screen-fade px-4 pt-safe">
      <header className="mb-3">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-brand">Uangku</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Riwayat</h1>
      </header>

      <div className="card mb-4 px-2 py-1.5">
        <MonthPicker
          month={month}
          busy={busy}
          isCurrentMonth={isCurrentMonth}
          onPrev={() => actions.shiftMonth(-1)}
          onNext={() => actions.shiftMonth(1)}
          onToday={actions.goToToday}
        />
      </div>

      {page.total === 0 ? (
        <div className="empty mt-6">
          <span aria-hidden="true" className="text-3xl">
            📭
          </span>
          <div>
            <p className="text-sm font-bold">Tidak ada transaksi</p>
            <p className="mt-1 text-xs text-muted">Belum ada catatan pada bulan ini.</p>
          </div>
          <button type="button" onClick={() => openForm({ type: 'expense' })} className="btn-primary">
            <PlusIcon size={18} /> Tambah transaksi
          </button>
        </div>
      ) : (
        <div className="mb-4 space-y-3">
          {groups.map((group) => (
            <section key={group.date}>
              <div className="mb-1.5 flex items-baseline justify-between px-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
                  {relativeDayLabel(group.date, today)}
                </h2>
                <span
                  className={`tabular text-xs font-bold ${
                    group.net >= 0 ? 'text-income' : 'text-expense'
                  }`}
                >
                  {group.net >= 0 ? '+' : '−'}
                  {formatRupiah(Math.abs(group.net))}
                </span>
              </div>
              <div className="card divide-y divide-line overflow-hidden">
                {group.items.map((transaction) => (
                  <TransactionItem
                    key={transaction.id}
                    transaction={transaction}
                    category={categoryMap.get(transaction.categoryId)}
                    today={today}
                    onClick={() => openForm({ editingId: transaction.id })}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {page.pageCount > 1 ? (
        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            type="button"
            className="btn-ghost flex-1"
            disabled={!page.hasPrev}
            onClick={() => actions.setHistoryPage(page.page - 1)}
          >
            Sebelumnya
          </button>
          <span className="shrink-0 text-xs font-semibold text-muted">
            {historyPage} / {page.pageCount}
          </span>
          <button
            type="button"
            className="btn-ghost flex-1"
            disabled={!page.hasNext}
            onClick={() => actions.setHistoryPage(page.page + 1)}
          >
            Berikutnya
          </button>
        </div>
      ) : (
        <div className="h-6" />
      )}
    </div>
  );
}
