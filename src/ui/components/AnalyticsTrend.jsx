import { useEffect, useRef, useState } from 'react';
import { formatRupiahCompact } from '../../core/currency.js';
import { monthShortLabel } from '../../core/period.js';
import { TABS } from '../../app/actions.js';
import { useApp } from '../context.jsx';

const SERIES = [
  { key: 'income', label: 'Pemasukan', color: 'var(--color-income)' },
  { key: 'expense', label: 'Pengeluaran', color: 'var(--color-expense)' },
  { key: 'balance', label: 'Saldo tercatat', color: 'var(--color-brand)' },
];

const WIDTH = 360;
const HEIGHT = 184;
const LEFT = 48;
const RIGHT = 310;
const TOP = 12;
const BOTTOM = 140;
const TOOLTIP_WIDTH = 112;
const TOOLTIP_HEIGHT = 58;

function xFor(index, count) {
  return count <= 1 ? (LEFT + RIGHT) / 2 : LEFT + (index / (count - 1)) * (RIGHT - LEFT);
}

function yFor(value, minimum, maximum) {
  const range = maximum - minimum || 1;
  return BOTTOM - ((value - minimum) / range) * (BOTTOM - TOP);
}

function makePath(points) {
  return points.map((point, index) =>
    `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
  ).join(' ');
}

export default function AnalyticsTrend({ rows = [] }) {
  const { actions } = useApp();
  const [activeIndex, setActiveIndex] = useState(Math.max(0, rows.length - 1));
  const [hiddenSeries, setHiddenSeries] = useState(() => new Set());
  const [tooltipIndex, setTooltipIndex] = useState(null);
  const svgRef = useRef(null);
  const draggingRef = useRef(false);

  // Saat rentang analisis berganti, pilih kembali bulan terakhir agar panel
  // detail tidak menampilkan indeks lama dari rentang sebelumnya.
  useEffect(() => {
    if (rows.length > 0) {
      setActiveIndex(rows.length - 1);
      setTooltipIndex(null);
    }
  }, [rows]);

  if (rows.length === 0) return null;

  const visibleSeries = SERIES.filter((series) => !hiddenSeries.has(series.key));
  const safeIndex = Math.min(activeIndex, rows.length - 1);
  const flowMaximum = Math.max(1, ...rows.flatMap((row) => [row.income, row.expense]));
  const balances = rows.map((row) => row.balance ?? 0);
  const balanceMinimumRaw = Math.min(...balances);
  const balanceMaximumRaw = Math.max(...balances);
  const balancePadding = Math.max(
    (balanceMaximumRaw - balanceMinimumRaw) * 0.08,
    Math.max(Math.abs(balanceMinimumRaw), Math.abs(balanceMaximumRaw), 1) * 0.02,
  );
  const balanceMinimum = balanceMinimumRaw - balancePadding;
  const balanceMaximum = balanceMaximumRaw + balancePadding;
  const flowTicks = Array.from({ length: 4 }, (_, index) =>
    Math.round(flowMaximum * (1 - index / 3)),
  );
  const points = {
    income: rows.map((row, index) => ({
      x: xFor(index, rows.length),
      y: yFor(row.income, 0, flowMaximum),
    })),
    expense: rows.map((row, index) => ({
      x: xFor(index, rows.length),
      y: yFor(row.expense, 0, flowMaximum),
    })),
    balance: rows.map((row, index) => ({
      x: xFor(index, rows.length),
      y: yFor(row.balance ?? 0, balanceMinimum, balanceMaximum),
    })),
  };
  const selected = rows[safeIndex];
  const tooltipRow = tooltipIndex === null ? null : rows[tooltipIndex];
  const tooltipAnchor = visibleSeries.find((series) => series.key === 'balance') ?? visibleSeries[0];
  const tooltipPoint = tooltipIndex === null ? null : points[tooltipAnchor.key][tooltipIndex];
  const tooltipX = tooltipPoint
    ? Math.min(Math.max(tooltipPoint.x - TOOLTIP_WIDTH / 2, LEFT), RIGHT - TOOLTIP_WIDTH)
    : LEFT;
  const tooltipY = tooltipPoint ? clampTooltipY(tooltipPoint.y) : TOP;

  function indexFromClientX(clientX) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rows.length <= 1) return 0;
    const x = ((clientX - rect.left) / rect.width) * WIDTH;
    const ratio = (x - LEFT) / (RIGHT - LEFT);
    return Math.max(0, Math.min(rows.length - 1, Math.round(ratio * (rows.length - 1))));
  }

  function selectIndex(index) {
    setActiveIndex(index);
    setTooltipIndex(index);
  }

  function handlePointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    draggingRef.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    selectIndex(indexFromClientX(event.clientX));
  }

  function handlePointerMove(event) {
    if (!draggingRef.current) {
      if (event.pointerType === 'mouse') setTooltipIndex(indexFromClientX(event.clientX));
      return;
    }
    selectIndex(indexFromClientX(event.clientX));
  }

  function handlePointerEnd(event) {
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handlePointerLeave(event) {
    if (event.pointerType === 'mouse' && !draggingRef.current) setTooltipIndex(null);
  }

  function toggleSeries(key) {
    setHiddenSeries((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      // Minimal satu seri tetap terlihat agar grafik tidak kosong.
      return next.size >= SERIES.length ? current : next;
    });
  }

  return (
    <section className="mb-4">
      <h2 className="section-title">Tren arus kas dan saldo</h2>
      <div className="card px-3.5 py-4">
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.68rem] font-semibold text-muted">
          {SERIES.map((series) => {
            const hidden = hiddenSeries.has(series.key);
            return (
              <button
                key={series.key}
                type="button"
                onClick={() => toggleSeries(series.key)}
                aria-pressed={!hidden}
                aria-label={`${hidden ? 'Tampilkan' : 'Sembunyikan'} ${series.label}`}
                className={`flex items-center gap-1.5 rounded-pill px-1.5 py-0.5 transition ${
                  hidden ? 'opacity-40' : ''
                }`}
              >
                <span
                  className="h-0.5 w-4 rounded-full"
                  style={{ backgroundColor: series.color }}
                />
                {series.label}
              </button>
            );
          })}
        </div>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="block w-full cursor-crosshair overflow-visible"
          role="group"
          aria-label="Grafik tren pemasukan, pengeluaran, dan saldo kumulatif. Geser atau sentuh untuk melihat nominal per bulan."
          style={{ touchAction: 'pan-y' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onPointerLeave={handlePointerLeave}
        >
          {flowTicks.map((tick, index) => {
            const y = TOP + (index / 3) * (BOTTOM - TOP);
            const balanceTick = balanceMaximum - ((balanceMaximum - balanceMinimum) * index) / 3;
            return (
              <g key={index}>
                <line x1={LEFT} x2={RIGHT} y1={y} y2={y} stroke="currentColor" opacity="0.12" strokeDasharray="3 4" />
                <text x={LEFT - 7} y={y + 3} textAnchor="end" fill="currentColor" opacity="0.62" fontSize="8">
                  {formatRupiahCompact(tick)}
                </text>
                <text x={RIGHT + 6} y={y + 3} textAnchor="start" fill="currentColor" opacity="0.62" fontSize="8">
                  {formatRupiahCompact(balanceTick)}
                </text>
              </g>
            );
          })}

          {visibleSeries.map(({ key, color }) => (
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
              {visibleSeries.map(({ key, color }) => {
                const currentPoint = points[key][index];
                const isSelected = index === safeIndex;
                return (
                  <g key={key}>
                    <circle
                      cx={currentPoint.x}
                      cy={currentPoint.y}
                      r="11"
                      fill="transparent"
                      className="cursor-pointer"
                      role="button"
                      tabIndex={0}
                      aria-label={`${seriesLabel(key)} (${seriesScale(key)}) ${monthShortLabel(row.month)}: ${formatRupiahCompact(row[key] ?? 0)}`}
                      onClick={() => selectIndex(index)}
                      onFocus={() => setTooltipIndex(index)}
                      onBlur={() => setTooltipIndex(null)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          selectIndex(index);
                        }
                      }}
                    />
                    {isSelected ? <circle cx={currentPoint.x} cy={currentPoint.y} r="6" fill={color} opacity="0.16" pointerEvents="none" /> : null}
                    <circle
                      cx={currentPoint.x}
                      cy={currentPoint.y}
                      r={isSelected ? 3.5 : 2.5}
                      fill={color}
                      stroke="var(--color-surface)"
                      strokeWidth="1.5"
                      pointerEvents="none"
                    >
                      <title>{`${seriesLabel(key)} (${seriesScale(key)}): ${formatRupiahCompact(row[key] ?? 0)}`}</title>
                    </circle>
                  </g>
                );
              })}
              <text x={points.balance[index].x} y="158" textAnchor="middle" fill="currentColor" opacity="0.7" fontSize="8.5">
                {monthShortLabel(row.month).split(' ')[0]}
              </text>
            </g>
          ))}

          {tooltipRow ? (
            <g pointerEvents="none">
              <rect
                x={tooltipX}
                y={tooltipY}
                width={TOOLTIP_WIDTH}
                height={TOOLTIP_HEIGHT}
                rx="8"
                fill="var(--color-surface)"
                stroke="currentColor"
                strokeOpacity="0.14"
              />
              <text x={tooltipX + 8} y={tooltipY + 13} fontSize="8" fontWeight="700" fill="currentColor">
                {monthShortLabel(tooltipRow.month)}
              </text>
              <text x={tooltipX + 8} y={tooltipY + 25} fontSize="7.5" fill="currentColor" opacity="0.82">
                Masuk {formatRupiahCompact(tooltipRow.income)}
              </text>
              <text x={tooltipX + 8} y={tooltipY + 36} fontSize="7.5" fill="currentColor" opacity="0.82">
                Keluar {formatRupiahCompact(tooltipRow.expense)}
              </text>
              <text x={tooltipX + 8} y={tooltipY + 47} fontSize="7.5" fill="currentColor" opacity="0.82">
                Saldo {formatRupiahCompact(tooltipRow.balance ?? 0)}
              </text>
            </g>
          ) : null}
        </svg>

        <div className="mt-1 rounded-xl bg-surface-2 px-3 py-2.5" aria-live="polite">
          <p className="mb-2 text-xs font-bold text-ink">{monthShortLabel(selected.month)}</p>
          <div className="grid grid-cols-3 gap-2">
            {SERIES.map(({ key, label, color }) => (
              <div key={key} className={`min-w-0 ${hiddenSeries.has(key) ? 'opacity-40' : ''}`}>
                <p className="truncate text-[0.6rem] font-medium text-muted" title={seriesScale(key)}>
                  {label}
                </p>
                <p className="truncate text-xs font-bold tabular" style={{ color }}>
                  {formatRupiahCompact(selected[key] ?? 0)}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[0.62rem] leading-relaxed text-muted">
            Geser grafik atau sentuh titik untuk memilih bulan.
          </p>
          <button
            type="button"
            onClick={async () => {
              await actions.setMonth(selected.month);
              actions.setTab(TABS.HISTORY);
            }}
            className="mt-2 text-[0.68rem] font-bold text-brand"
          >
            Lihat transaksi {monthShortLabel(selected.month)}
          </button>
        </div>
        <p className="mt-2 text-[0.62rem] leading-relaxed text-muted">
          Skala kiri untuk arus kas bulanan; skala kanan untuk saldo kumulatif. Saldo tercatat mencakup transaksi sebelum periode grafik dan bukan saldo rekening aktual.
        </p>
      </div>
    </section>
  );
}

function clampTooltipY(pointY) {
  const above = pointY - TOOLTIP_HEIGHT - 10;
  const below = pointY + 12;
  const y = above < TOP ? below : above;
  return Math.min(Math.max(y, 2), HEIGHT - TOOLTIP_HEIGHT - 2);
}

function seriesLabel(key) {
  return SERIES.find((series) => series.key === key)?.label ?? key;
}

function seriesScale(key) {
  return key === 'balance' ? 'saldo kumulatif, skala kanan' : 'arus kas bulanan, skala kiri';
}
