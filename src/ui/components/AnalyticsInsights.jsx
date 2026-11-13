import { formatRupiahCompact } from '../../core/currency.js';
import { monthLabel } from '../../core/period.js';

function describeInsight(insight, categories) {
  const category = categories.find((item) => item.id === insight.categoryId);
  const categoryName = category?.name ?? 'Kategori tidak ditemukan';

  switch (insight.type) {
    case 'top-category':
      return {
        icon: category?.emoji ?? '🏷️',
        title: 'Pengeluaran terbesar',
        detail: `${categoryName} menghabiskan ${formatRupiahCompact(insight.total)} atau ${insight.sharePercent.toLocaleString('id-ID')}% dari total pengeluaran.`,
      };
    case 'expense-change': {
      if (insight.changePercent === 0) {
        return {
          icon: '➖',
          title: 'Pengeluaran stabil',
          detail: 'Total pengeluaran sama dengan bulan sebelumnya.',
        };
      }
      const direction = insight.changePercent > 0 ? 'naik' : 'turun';
      return {
        icon: insight.changePercent > 0 ? '📈' : '📉',
        title: `Pengeluaran ${direction} ${Math.abs(insight.changePercent).toLocaleString('id-ID')}%`,
        detail: `Dibandingkan ${monthLabel(insight.previousMonth)}. Selisih ${formatRupiahCompact(Math.abs(insight.current - insight.previous))}.`,
      };
    }
    case 'first-expense-month':
      return {
        icon: '🧾',
        title: 'Pengeluaran mulai tercatat',
        detail: `Bulan terakhir mencatat pengeluaran ${formatRupiahCompact(insight.current)}; bulan sebelumnya belum ada pengeluaran tercatat.`,
      };
    case 'negative-cashflow':
      return {
        icon: '⚠️',
        title: 'Pengeluaran melebihi pemasukan',
        detail: `Selisih negatif ${formatRupiahCompact(insight.amount)} pada periode yang dipilih.`,
      };
    case 'positive-cashflow':
      return {
        icon: '🌱',
        title: 'Arus kas positif',
        detail: `Pemasukan tercatat lebih besar ${formatRupiahCompact(insight.amount)} dari pengeluaran (${insight.ratePercent.toLocaleString('id-ID')}% dari pemasukan).`,
      };
    case 'no-data':
      return {
        icon: '📊',
        title: 'Belum ada data',
        detail: 'Catat transaksi terlebih dahulu untuk melihat analisis keuangan.',
      };
    default:
      return null;
  }
}

export default function AnalyticsInsights({ items = [], categories = [] }) {
  const descriptions = items.map((item) => describeInsight(item, categories)).filter(Boolean);

  return (
    <section className="mb-6">
      <h2 className="section-title">Insight otomatis</h2>
      {descriptions.length === 0 ? (
        <div className="card px-4 py-4 text-sm text-muted">
          Insight akan muncul setelah tersedia transaksi pada periode ini.
        </div>
      ) : (
        <div className="card divide-y divide-line">
          {descriptions.map((item, index) => (
            <div key={`${item.title}-${index}`} className="flex items-start gap-3 px-4 py-3.5">
              <span aria-hidden="true" className="mt-0.5 text-xl">{item.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-bold">{item.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
