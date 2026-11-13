/**
 * Analisis transaksi lintas bulan.
 * Pure functions only: no React, storage, DOM, or implicit clock.
 */
import { addMonths, isValidMonthKey } from './period.js';
import { byCategory, monthlyTrend, summarize } from './summary.js';
import { TYPES } from './transaction.js';

export const ANALYTICS_PERIODS = Object.freeze([3, 6, 12]);

function percentChange(current, previous) {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/**
 * @param {Array<object>} transactions
 * @param {{ endMonth:string, months?:3|6|12 }} options
 */
export function analyzeTransactions(transactions = [], options = {}) {
  const endMonth = options.endMonth;
  const months = options.months ?? 6;

  if (!isValidMonthKey(endMonth)) {
    throw new TypeError('Bulan akhir analisis tidak valid.');
  }
  if (!ANALYTICS_PERIODS.includes(months)) {
    throw new RangeError('Periode analisis harus 3, 6, atau 12 bulan.');
  }

  const monthKeys = Array.from({ length: months }, (_, index) =>
    addMonths(endMonth, index - months + 1),
  );
  const includedMonths = new Set(monthKeys);
  const scopedTransactions = transactions.filter((item) =>
    includedMonths.has(item.month ?? item.date?.slice(0, 7)),
  );

  const summary = summarize(scopedTransactions);
  const trendMap = new Map(
    monthlyTrend(scopedTransactions).map((row) => [row.month, row]),
  );
  const trend = monthKeys.map((month) => ({
    month,
    income: trendMap.get(month)?.income ?? 0,
    expense: trendMap.get(month)?.expense ?? 0,
    net: trendMap.get(month)?.net ?? 0,
  }));

  const latest = trend[trend.length - 1];
  const previous = trend[trend.length - 2] ?? null;
  const categories = byCategory(scopedTransactions).filter(
    (row) => row.type === TYPES.EXPENSE,
  );
  const topCategories = categories.slice(0, 5).map((row) => ({
    ...row,
    sharePercent: summary.expense > 0
      ? Math.round((row.total / summary.expense) * 1000) / 10
      : 0,
  }));

  const insights = [];
  if (summary.count === 0) {
    insights.push({ type: 'no-data' });
  } else {
    if (topCategories[0]) {
      insights.push({
        type: 'top-category',
        categoryId: topCategories[0].categoryId,
        total: topCategories[0].total,
        sharePercent: topCategories[0].sharePercent,
      });
    }

    if (previous?.expense > 0) {
      insights.push({
        type: 'expense-change',
        current: latest.expense,
        previous: previous.expense,
        previousMonth: previous.month,
        changePercent: percentChange(latest.expense, previous.expense),
      });
    } else if (latest.expense > 0) {
      insights.push({ type: 'first-expense-month', current: latest.expense });
    }

    if (summary.balance < 0) {
      insights.push({ type: 'negative-cashflow', amount: Math.abs(summary.balance) });
    } else if (summary.income > 0) {
      insights.push({
        type: 'positive-cashflow',
        amount: summary.balance,
        ratePercent: Math.round((summary.balance / summary.income) * 1000) / 10,
      });
    }
  }

  return {
    startMonth: monthKeys[0],
    endMonth,
    months,
    monthKeys,
    summary,
    trend,
    latest,
    previous,
    averages: {
      income: Math.round(summary.income / months),
      expense: Math.round(summary.expense / months),
      balance: Math.round(summary.balance / months),
    },
    topCategories,
    comparison: {
      expenseChangePercent: percentChange(latest.expense, previous?.expense ?? 0),
      incomeChangePercent: percentChange(latest.income, previous?.income ?? 0),
    },
    insights,
  };
}
