/**
 * Use case aplikasi. Satu-satunya lapisan yang mengoordinasikan
 * repository, store, dan Storage API.
 */
import { summarize, byCategory, groupByDate } from '../core/summary.js';
import { analyzeTransactions, ANALYTICS_PERIODS } from '../core/analytics.js';
import { addMonths, isValidMonthKey, monthKeyOf } from '../core/period.js';
import { formatRupiah } from '../core/currency.js';
import { backupFileName, buildBackup } from '../data/backup.js';
import {
  getPersistedStatus,
  getStorageEstimate,
  requestPersistence,
} from '../data/storage.js';

export const TABS = Object.freeze({
  SUMMARY: 'summary',
  HISTORY: 'history',
  SETTINGS: 'settings',
  ANALYTICS: 'analytics',
});

const TOAST_MS = 3200;

const initialState = {
  ready: false,
  fatalError: null,
  busy: false,
  tab: TABS.SUMMARY,
  month: null,
  today: null,
  transactions: [],
  categories: [],
  summary: { income: 0, expense: 0, balance: 0, count: 0 },
  breakdown: [],
  groups: [],
  analytics: { period: 6, loading: false, data: null, error: null },
  historyPage: 1,
  diagnostics: null,
  storage: {
    supported: false,
    persisted: false,
    usage: null,
    quota: null,
    lastBackupAt: null,
    mirror: null,
  },
  toast: null,
  lastImport: null,
};

export function createActions({ repo, store, now, today }) {
  if (!repo) throw new TypeError('createActions membutuhkan repository.');
  if (!store) throw new TypeError('createActions membutuhkan store.');

  const set = store.setState;
  const get = store.getState;

  let toastTimer = null;
  let toastSeq = 0;
  let analyticsRequestId = 0;

  function toast(message, kind = 'info') {
    toastSeq += 1;
    const id = toastSeq;
    set({ toast: { id, message, kind } });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (get().toast?.id === id) set({ toast: null });
    }, TOAST_MS);
    // Jangan menahan proses Node tetap hidup saat pengujian.
    toastTimer?.unref?.();
  }

  function dismissToast() {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: null });
  }

  function friendlyError(error) {
    if (!error) return 'Terjadi kesalahan tidak dikenal.';
    if (error.code === 'validation' && error.details?.length) return error.details[0];
    return error.message ?? 'Terjadi kesalahan.';
  }

  async function loadMonth(month) {
    const target = isValidMonthKey(month) ? month : get().month;
    const transactions = await repo.listByMonth(target);
    return {
      month: target,
      transactions,
      summary: summarize(transactions),
      breakdown: byCategory(transactions),
      groups: groupByDate(transactions),
    };
  }

  async function refreshDiagnostics() {
    const [persisted, estimate, diagnostics, mirror] = await Promise.all([
      getPersistedStatus(),
      getStorageEstimate(),
      repo.diagnostics(),
      repo.mirrorSnapshot(),
    ]);

    set({
      diagnostics,
      storage: {
        supported: estimate.supported,
        persisted: persisted.persisted,
        usage: estimate.usage,
        quota: estimate.quota,
        lastBackupAt: diagnostics.lastBackupAt,
        mirror: mirror ? { present: true } : { present: false },
      },
    });
    return diagnostics;
  }

  async function loadAnalytics(period = get().analytics.period) {
    const selectedPeriod = ANALYTICS_PERIODS.includes(period)
      ? period
      : get().analytics.period;
    const endMonth = get().month;
    if (!isValidMonthKey(endMonth)) return null;

    const requestId = ++analyticsRequestId;
    set({
      analytics: {
        ...get().analytics,
        period: selectedPeriod,
        loading: true,
        data: null,
        error: null,
      },
    });

    try {
      // Saldo kumulatif membutuhkan transaksi sebelum awal periode.
      // Database bersifat lokal/offline; listAll membaca IndexedDB tanpa mengubah data.
      const allTransactions = await repo.listAll();
      const data = analyzeTransactions(allTransactions, {
        endMonth,
        months: selectedPeriod,
      });

      if (requestId === analyticsRequestId) {
        set({ analytics: { period: selectedPeriod, loading: false, data, error: null } });
      }
      return data;
    } catch (error) {
      if (requestId === analyticsRequestId) {
        set({
          analytics: {
            ...get().analytics,
            loading: false,
            error: friendlyError(error),
          },
        });
      }
      return null;
    }
  }

  async function refresh() {
    const snapshot = await loadMonth(get().month);
    set({ ...snapshot, historyPage: 1 });
    if (get().tab === TABS.ANALYTICS) await loadAnalytics();
    return snapshot;
  }

  async function init() {
    set({ busy: true });
    try {
      const notes = await repo.init();
      const categories = await repo.listCategories();
      const todayISO = today();
      const month = monthKeyOf(todayISO);

      set({ ready: true, categories, today: todayISO, month, fatalError: null });
      await refresh();
      await refreshDiagnostics();
      await requestPersistence().catch(() => null);

      // Jika database kosong tapi ada cermin cadangan, beri tahu pengguna.
      const mirrorData = await repo.mirrorSnapshot();
      if (notes.seededCategories && mirrorData?.transactions?.length) {
        set({
          storage: { ...get().storage, mirror: { present: true, transactions: mirrorData.transactions.length } },
        });
        toast('Ada salinan data lama di perangkat. Buka Pengaturan untuk memulihkan.', 'warn');
      }
      return notes;
    } catch (error) {
      console.error('[actions] gagal inisialisasi', error);
      set({ ready: false, fatalError: friendlyError(error) });
      throw error;
    } finally {
      set({ busy: false });
    }
  }

  async function setMonth(month) {
    if (!isValidMonthKey(month) || month === get().month) return;
    set({ busy: true });
    try {
      const snapshot = await loadMonth(month);
      set({ ...snapshot, historyPage: 1 });
      if (get().tab === TABS.ANALYTICS) await loadAnalytics();
    } finally {
      set({ busy: false });
    }
  }

  function shiftMonth(delta) {
    const current = get().month;
    if (!current) return;
    return setMonth(addMonths(current, delta));
  }

  function goToToday() {
    return setMonth(monthKeyOf(today()));
  }

  function setTab(tab) {
    if (!Object.values(TABS).includes(tab)) return;
    set({ tab });
    if (tab === TABS.ANALYTICS) return loadAnalytics();
  }

  function setHistoryPage(page) {
    set({ historyPage: Math.max(1, Math.trunc(page) || 1) });
  }

  async function saveTransaction(input, options = {}) {
    set({ busy: true });
    try {
      const editingId = options.id ?? null;
      const result = editingId
        ? await repo.update(editingId, input)
        : await repo.create(input);

      const targetMonth = result.month;
      if (targetMonth !== get().month) await setMonth(targetMonth);
      else await refresh();

      await refreshDiagnostics();
      toast(
        editingId
          ? 'Perubahan disimpan.'
          : `${input.type === 'income' ? 'Pemasukan' : 'Pengeluaran'} ${formatRupiah(result.amount)} dicatat.`,
        'success',
      );
      return result;
    } catch (error) {
      if (error.name === 'ValidationError' && error.errors) {
        const validation = new Error(friendlyError(error));
        validation.name = 'FormError';
        validation.fieldErrors = error.errors;
        throw validation;
      }
      if (error.code === 'validation') {
        const validation = new Error(friendlyError(error));
        validation.name = 'FormError';
        validation.fieldErrors = { form: friendlyError(error) };
        throw validation;
      }
      toast(friendlyError(error), 'error');
      throw error;
    } finally {
      set({ busy: false });
    }
  }

  async function deleteTransaction(id) {
    set({ busy: true });
    try {
      const removed = await repo.remove(id);
      await refresh();
      await refreshDiagnostics();
      toast(`Transaksi ${formatRupiah(removed.amount)} dihapus.`, 'success');
      return removed;
    } catch (error) {
      toast(friendlyError(error), 'error');
      throw error;
    } finally {
      set({ busy: false });
    }
  }

  async function addCategory(name, type) {
    try {
      const category = await repo.addCategory({ name, type });
      set({ categories: await repo.listCategories() });
      toast('Kategori ditambahkan.', 'success');
      return category;
    } catch (error) {
      toast(friendlyError(error), 'error');
      throw error;
    }
  }

  async function removeCategory(id) {
    try {
      await repo.removeCategory(id);
      set({ categories: await repo.listCategories() });
      toast('Kategori dihapus.', 'success');
    } catch (error) {
      toast(friendlyError(error), 'error');
      throw error;
    }
  }

  async function exportBackup() {
    const payload = await repo.exportBackup();
    const exportedAt = payload.exportedAt ?? now();
    const withStamp = buildBackup({
      transactions: payload.transactions,
      categories: payload.categories,
      exportedAt,
    });
    await refreshDiagnostics();
    return {
      filename: backupFileName(exportedAt),
      text: JSON.stringify(withStamp, null, 2),
      counts: withStamp.counts,
    };
  }

  async function importBackup(text, mode = 'merge') {
    set({ busy: true });
    try {
      const result = await repo.importBackup(text, { mode });
      const categories = await repo.listCategories();
      set({ categories });
      await refresh();
      await refreshDiagnostics();
      set({ lastImport: { ...result, at: now() } });
      toast(
        result.mode === 'replace'
          ? `Data diganti: ${result.transactions.total} transaksi.`
          : `Impor selesai: ${result.transactions.added} baru, ${result.transactions.updated} diperbarui.`,
        'success',
      );
      return result;
    } catch (error) {
      toast(friendlyError(error), 'error');
      throw error;
    } finally {
      set({ busy: false });
    }
  }

  async function enablePersistence() {
    const result = await requestPersistence();
    await refreshDiagnostics();
    toast(
      result.persisted
        ? 'Penyimpanan permanen aktif. Data lebih aman dari pembersihan otomatis.'
        : 'Browser belum mengizinkan penyimpanan permanen.',
      result.persisted ? 'success' : 'warn',
    );
    return result;
  }

  return {
    init,
    refresh,
    refreshDiagnostics,
    setMonth,
    shiftMonth,
    goToToday,
    loadAnalytics,
    setTab,
    setHistoryPage,
    saveTransaction,
    deleteTransaction,
    addCategory,
    removeCategory,
    exportBackup,
    importBackup,
    enablePersistence,
    toast,
    dismissToast,
    getState: get,
  };
}

export { initialState };
