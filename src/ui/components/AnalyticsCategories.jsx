import { formatRupiahCompact } from '../../core/currency.js';

export default function AnalyticsCategories({ items = [], categories = [], totalExpense = 0 }) {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  return (
    <section className="mb-4">
      <h2 className="section-title">Kategori pengeluaran terbesar</h2>
      {items.length === 0 ? (
        <div className="empty py-7">
          <span aria-hidden="true" className="text-2xl">🧾</span>
          <p className="text-sm font-semibold">Belum ada pengeluaran pada periode ini</p>
        </div>
      ) : (
        <div className="card divide-y divide-line">
          {items.map((item) => {
            const category = categoryMap.get(item.categoryId);
            const width = totalExpense > 0 ? Math.max(2, item.sharePercent) : 0;
            return (
              <div key={item.categoryId} className="px-4 py-3">
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                    <span aria-hidden="true">{category?.emoji ?? '🏷️'}</span>
                    <span className="truncate">{category?.name ?? 'Kategori tidak ditemukan'}</span>
                  </span>
                  <span className="tabular shrink-0 text-right">
                    <span className="block text-sm font-bold">{formatRupiahCompact(item.total)}</span>
                    <span className="text-[0.65rem] text-muted">{item.sharePercent.toLocaleString('id-ID')}%</span>
                  </span>
                </div>
                <div className="stat-bar">
                  <div className="h-full rounded-pill bg-expense" style={{ width: `${Math.min(100, width)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
