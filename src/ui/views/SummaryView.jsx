import { useApp, useAppState } from '../context.jsx';
import MonthPicker from '../components/MonthPicker.jsx';
import TransactionItem from '../components/TransactionItem.jsx';
import { TABS } from '../../app/actions.js';
import { formatRupiah, formatRupiahCompact } from '../../core/currency.js';
import { monthKeyOf } from '../../core/period.js';
import { ArrowDownIcon, ArrowUpIcon, PlusIcon } from '../components/Icons.jsx';

export default function SummaryView() {
  const { actions, openForm } = useApp();
  const state = useAppState();

  const { month, today, summary, breakdown, categories, transactions, busy } = state;
  const isCurrentMonth = month === monthKeyOf(today);

  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const expenseBreakdown = breakdown.filter((row) => row.type === 'expense').slice(0, 4);
  const recent = transactions.slice(0, 5);

  return (
    <div className="screen-fade px-4 pt-safe">
      <header className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-brand">Uangku</p>
          <h1 className="text-2xl font-extrabold tracking-tight">Ringkasan</h1>
        </div>
        <span className="mb-1 rounded-pill border border-line bg-surface px-2.5 py-1 text-[0.68rem] font-semibold text-muted">
          {summary.count} transaksi
        </span>
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

      <section className="mb-4">
        <div className="rounded-card bg-gradient-to-br from-hero-from to-hero-to p-5 text-hero-ink shadow-card">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] opacity-70">
            Saldo bulan ini
          </p>
          <p className="tabular mt-1 text-[1.75rem] font-extrabold leading-tight tracking-tight">
            {formatRupiah(summary.balance)}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/15 px-3 py-2 backdrop-blur-sm dark:bg-white/[0.06]">
              <p className="flex items-center gap-1 text-[0.62rem] font-bold uppercase tracking-wider opacity-75">
                <ArrowDownIcon size={12} /> Masuk
              </p>
              <p className="tabular mt-0.5 text-sm font-bold">
                {formatRupiahCompact(summary.income)}
              </p>
            </div>
            <div className="rounded-xl bg-white/15 px-3 py-2 backdrop-blur-sm dark:bg-white/[0.06]">
              <p className="flex items-center gap-1 text-[0.62rem] font-bold uppercase tracking-wider opacity-75">
                <ArrowUpIcon size={12} /> Keluar
              </p>
              <p className="tabular mt-0.5 text-sm font-bold">
                {formatRupiahCompact(summary.expense)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => openForm({ type: 'expense' })}
          className="card flex items-center gap-2.5 px-3.5 py-3 text-left transition active:scale-[0.99]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-expense-soft text-expense">
            <PlusIcon size={18} />
          </span>
          <span>
            <span className="block text-[0.7rem] font-semibold uppercase tracking-wider text-muted">
              Catat
            </span>
            <span className="block text-sm font-bold">Pengeluaran</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => openForm({ type: 'income' })}
          className="card flex items-center gap-2.5 px-3.5 py-3 text-left transition active:scale-[0.99]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-income-soft text-income">
            <PlusIcon size={18} />
          </span>
          <span>
            <span className="block text-[0.7rem] font-semibold uppercase tracking-wider text-muted">
              Catat
            </span>
            <span className="block text-sm font-bold">Pemasukan</span>
          </span>
        </button>
      </section>

      {expenseBreakdown.length > 0 ? (
        <section className="mb-4">
          <h2 className="section-title">Pengeluaran teratas</h2>
          <div className="card divide-y divide-line">
            {expenseBreakdown.map((row) => {
              const category = categoryMap.get(row.categoryId);
              const percent = summary.expense > 0 ? (row.total / summary.expense) * 100 : 0;
              return (
                <div key={`${row.type}-${row.categoryId}`} className="px-4 py-3">
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                      <span aria-hidden="true">{category?.emoji ?? '🏷️'}</span>
                      <span className="truncate">{category?.name ?? 'Tanpa kategori'}</span>
                    </span>
                    <span className="tabular shrink-0 text-sm font-bold text-expense">
                      {formatRupiahCompact(row.total)}
                    </span>
                  </div>
                  <div className="stat-bar">
                    <div
                      className="h-full rounded-pill bg-expense"
                      style={{ width: `${Math.max(4, Math.round(percent))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="mb-6">
        <div className="mb-2.5 flex items-center justify-between px-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted">
            Transaksi terakhir
          </h2>
          {transactions.length > 0 ? (
            <button
              type="button"
              onClick={() => actions.setTab(TABS.HISTORY)}
              className="text-xs font-bold text-brand"
            >
              Lihat semua
            </button>
          ) : null}
        </div>

        {recent.length === 0 ? (
          <div className="empty">
            <span aria-hidden="true" className="text-3xl">
              🧾
            </span>
            <div>
              <p className="text-sm font-bold">Belum ada catatan bulan ini</p>
              <p className="mt-1 text-xs text-muted">
                Mulai dari pengeluaran kecil hari ini — nanti otomatis terhitung.
              </p>
            </div>
            <button type="button" onClick={() => openForm({ type: 'expense' })} className="btn-primary">
              <PlusIcon size={18} /> Catat sekarang
            </button>
          </div>
        ) : (
          <div className="card divide-y divide-line overflow-hidden">
            {recent.map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                category={categoryMap.get(transaction.categoryId)}
                today={today}
                showDate
                onClick={() => openForm({ editingId: transaction.id })}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
