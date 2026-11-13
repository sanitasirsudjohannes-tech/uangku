import { useApp, useAppState } from '../context.jsx';
import { formatRupiah, formatRupiahCompact } from '../../core/currency.js';
import { monthLabel } from '../../core/period.js';
import { ANALYTICS_PERIODS } from '../../core/analytics.js';
import AnalyticsCategories from '../components/AnalyticsCategories.jsx';
import AnalyticsInsights from '../components/AnalyticsInsights.jsx';
import AnalyticsMonthlyExpense from '../components/AnalyticsMonthlyExpense.jsx';
import AnalyticsTrend from '../components/AnalyticsTrend.jsx';

const METRICS = [
  { key: 'income', label: 'Total masuk', tone: 'text-income' },
  { key: 'expense', label: 'Total keluar', tone: 'text-expense' },
  { key: 'balance', label: 'Selisih', tone: '' },
];

export default function AnalyticsView() {
  const { actions } = useApp();
  const state = useAppState();
  const analytics = state.analytics;
  const data = analytics.data;

  return (
    <div className="screen-fade px-4 pt-safe">
      <header className="mb-4">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-brand">Uangku</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Analisis</h1>
        <p className="mt-1 text-xs text-muted">
          Pola arus kas dan pengeluaran berdasarkan transaksi yang dicatat.
        </p>
      </header>

      <section className="mb-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Rentang analisis</h2>
          {data ? <span className="text-[0.68rem] text-muted">s.d. {monthLabel(data.endMonth)}</span> : null}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {ANALYTICS_PERIODS.map((period) => (
            <button
              key={period}
              type="button"
              aria-pressed={analytics.period === period}
              disabled={analytics.loading}
              onClick={() => actions.loadAnalytics(period)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition disabled:opacity-50 ${analytics.period === period ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-surface text-muted'}`}
            >
              {period} bulan
            </button>
          ))}
        </div>
      </section>

      {analytics.error ? (
        <div role="alert" className="card mb-4 border-expense/40 px-4 py-3 text-sm text-expense">
          Gagal memuat analisis: {analytics.error}
          <button type="button" onClick={() => actions.loadAnalytics(analytics.period)} className="ml-2 font-bold underline">
            Coba lagi
          </button>
        </div>
      ) : null}

      {analytics.loading && !data ? (
        <div className="empty py-10">
          <span className="text-2xl" aria-hidden="true">📊</span>
          <p className="text-sm font-semibold">Menghitung analisis transaksi…</p>
        </div>
      ) : data ? (
        <>
          <AnalyticsMonthlyExpense
            current={data.latest}
            previous={data.previous}
            changePercent={data.comparison.expenseChangePercent}
          />

          <section className="mb-4">
            <h2 className="section-title">Ringkasan {data.months} bulan</h2>
            <div className="grid grid-cols-2 gap-2">
              {METRICS.map((metric) => (
                <div key={metric.key} className={`card px-3.5 py-3 ${metric.key === 'balance' ? 'col-span-2' : ''}`}>
                  <p className="text-[0.66rem] font-bold uppercase tracking-wider text-muted">{metric.label}</p>
                  <p className={`tabular mt-1 text-lg font-extrabold ${metric.tone || (data.summary.balance < 0 ? 'text-expense' : 'text-ink')}`}>
                    {metric.key === 'balance' ? formatRupiah(data.summary.balance) : formatRupiahCompact(data.summary[metric.key])}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-2 px-1 text-[0.68rem] leading-relaxed text-muted">
              Rata-rata per bulan: masuk {formatRupiahCompact(data.averages.income)} · keluar {formatRupiahCompact(data.averages.expense)}.
            </p>
          </section>

          <AnalyticsTrend rows={data.trend} />
          <AnalyticsCategories
            items={data.topCategories}
            categories={state.categories}
            totalExpense={data.summary.expense}
          />
          <AnalyticsInsights items={data.insights} categories={state.categories} />
          <p className="mb-6 px-1 text-[0.65rem] leading-relaxed text-muted">
            Analisis hanya memakai transaksi yang tersimpan pada perangkat ini. Perbandingan bulan terakhir dengan bulan sebelumnya bersifat sementara jika bulan terakhir belum selesai.
          </p>
        </>
      ) : null}
    </div>
  );
}
