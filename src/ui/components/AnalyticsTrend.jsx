import { useState } from 'react';
import { formatRupiahCompact } from '../../core/currency.js';
import { monthShortLabel } from '../../core/period.js';

const SERIES = [
  { key: 'income', label: 'Pemasukan', color: 'var(--color-income)' },
  { key: 'expense', label: 'Pengeluaran', color: 'var(--color-expense)' },
  { key: 'balance', label: 'Saldo tercatat', color: 'var(--color-brand)' },
];

const WIDTH = 360;
const HEIGHT = 184;
const LEFT = 48;
const RIGHT = 350;
const TOP = 12;
const BOTTOM = 140;

function pointFor(index, value, count, minimum, maximum) {
  const x = count <= 1 ? (LEFT + RIGHT) / 2 : LEFT + (index / (count - 1)) * (RIGHT - LEFT);
  const range = maximum - minimum || 1;
  const y = BOTTOM - ((value - minimum) / range) * (BOTTOM - TOP);
  return { x, y };
}

function makePath(points) {
  return points.map((point, index) =>
    `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
  ).join(' ');
}

export default function AnalyticsTrend({ rows = [] }) {
  const [activeIndex, setActiveIndex] = useState(Math.max(0, rows.length - 1));

  if (rows.length === 0) return null;

  const safeIndex = Math.min(activeIndex, rows.length - 1);
  const values = rows.flatMap((row) => SERIES.map(({ key }) => row[key] ?? 0));
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(1, ...values);
  const ticks = Array.from({ length: 4 }, (_, index) =>
    maximum - ((maximum - minimum) * index) / 3,
  );
  const points = Object.fromEntries(SERIES.map(({ key }) => [
    key,
    rows.map((row, index) => pointFor(index, row[key] ?? 0, rows.length, minimum, maximum)),
  ]));
  const selected = rows[safeIndex];

  return (
    <section className="mb-4">
      <h2 className="section-title">Tren arus kas dan saldo</h2>
      <div className="card px-3.5 py-4">
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.68rem] font-semibold text-muted">
          {SERIES.map((series) => (
            <span key={series.key} className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: series.color }} />
              {series.label}
            </span>
          ))}
        </div>

        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="block w-full overflow-visible"
          role="group"
          aria-label="Grafik tren pemasukan, pengeluaran, dan saldo kumulatif. Sentuh titik untuk melihat nominal."
        >
          {ticks.map((tick, index) => {
            const y = TOP + (index / 3) * (BOTTOM - TOP);
            return (
              <g key={index}>
                <line x1={LEFT} x2={RIGHT} y1={y} y2={y} stroke="currentColor" opacity="0.12" strokeDasharray="3 4" />
                <text x={LEFT - 7} y={y + 3} textAnchor="end" fill="currentColor" opacity="0.62" fontSize="8">
                  {formatRupiahCompact(tick)}
                </text>
              </g>
            );
          })}

          {SERIES.map(({ key, color }) => (
            <path
              key={key}
              d={makePath(points[key])}
              fill="none"
              stroke={color}
              strokeWidth={key === 'balance' ? 2.8 : 2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {rows.map((row, index) => (
            <g key={row.month}>
              {SERIES.map(({ key, color }) => {
                const current = points[key][index];
                const isSelected = index === safeIndex;
                return (
                  <g key={key}>
                    {isSelected ? <circle cx={current.x} cy={current.y} r="6" fill={color} opacity="0.16" /> : null}
                    <circle
                      cx={current.x}
                      cy={current.y}
                      r={isSelected ? 3.5 : 2.5}
                      fill={color}
                      stroke="var(--color-surface)"
                      strokeWidth="1.5"
                      className="cursor-pointer"
                      role="button"
                      tabIndex={0}
                      aria-label={`${seriesLabel(key)} ${monthShortLabel(row.month)}: ${formatRupiahCompact(row[key] ?? 0)}`}
                      onClick={() => setActiveIndex(index)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setActiveIndex(index);
                        }
                      }}
                    >
                      <title>{`${seriesLabel(key)}: ${formatRupiahCompact(row[key] ?? 0)}`}</title>
                    </circle>
                  </g>
                );
              })}
              <text x={points.balance[index].x} y="158" textAnchor="middle" fill="currentColor" opacity="0.7" fontSize="8.5">
                {monthShortLabel(row.month).split(' ')[0]}
              </text>
            </g>
          ))}
        </svg>

        <div className="mt-1 rounded-xl bg-surface-2 px-3 py-2.5" aria-live="polite">
          <p className="mb-2 text-xs font-bold text-ink">{monthShortLabel(selected.month)}</p>
          <div className="grid grid-cols-3 gap-2">
            {SERIES.map(({ key, label, color }) => (
              <div key={key} className="min-w-0">
                <p className="truncate text-[0.6rem] font-medium text-muted">{label}</p>
                <p className="truncate text-xs font-bold tabular" style={{ color }}>
                  {formatRupiahCompact(selected[key] ?? 0)}
                </p>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-2 text-[0.62rem] leading-relaxed text-muted">
          Saldo tercatat adalah akumulasi transaksi yang dimasukkan ke aplikasi, termasuk transaksi sebelum periode grafik. Angka ini bukan saldo rekening aktual.
        </p>
      </div>
    </section>
  );
}

function seriesLabel(key) {
  return SERIES.find((series) => series.key === key)?.label ?? key;
}
