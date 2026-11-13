import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppContext, useApp, useAppState } from './context.jsx';
import BottomNav from './components/BottomNav.jsx';
import Toast from './components/Toast.jsx';
import SummaryView from './views/SummaryView.jsx';
import HistoryView from './views/HistoryView.jsx';
import SettingsView from './views/SettingsView.jsx';
import FormSheet from './views/FormSheet.jsx';
import { TABS } from '../app/actions.js';

const CLOSED_FORM = { open: false, editingId: null, presetType: 'expense' };

export default function App({ store, actions }) {
  const [form, setForm] = useState(CLOSED_FORM);

  const openForm = useCallback((options = {}) => {
    setForm({
      open: true,
      editingId: options.editingId ?? null,
      presetType: options.type === 'income' ? 'income' : 'expense',
    });
  }, []);

  const closeForm = useCallback(() => {
    setForm((current) => ({ ...current, open: false }));
  }, []);

  const value = useMemo(
    () => ({ store, actions, openForm, closeForm, form }),
    [store, actions, openForm, closeForm, form],
  );

  return (
    <AppContext.Provider value={value}>
      <AppShell />
    </AppContext.Provider>
  );
}

function AppShell() {
  const { actions, openForm, form } = useApp();
  const state = useAppState();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const aksi = params.get('aksi');
    if (aksi === 'pengeluaran' || aksi === 'pemasukan') {
      openForm({ type: aksi === 'pemasukan' ? 'income' : 'expense' });
    }
    if (aksi) {
      params.delete('aksi');
      const query = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
    }
  }, [openForm]);

  let content;
  if (state.fatalError) {
    content = <FatalError message={state.fatalError} />;
  } else if (!state.ready) {
    content = <LoadingScreen />;
  } else if (state.tab === TABS.HISTORY) {
    content = <HistoryView />;
  } else if (state.tab === TABS.SETTINGS) {
    content = <SettingsView />;
  } else {
    content = <SummaryView />;
  }

  return (
    <div className="app-shell bg-bg">
      <main className="flex-1 pb-nav">{content}</main>

      {state.ready && !state.fatalError ? (
        <>
          <BottomNav />
          <FormSheet form={form} />
        </>
      ) : null}

      <Toast />
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="pop flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-brand text-2xl font-extrabold text-brand-ink shadow-card">
        U
      </div>
      <div className="h-1.5 w-32 overflow-hidden rounded-pill bg-surface-2">
        <div className="h-full w-1/2 animate-pulse rounded-pill bg-brand" />
      </div>
      <p className="text-sm font-medium text-muted">Menyiapkan catatan keuangan…</p>
    </div>
  );
}

function FatalError({ message }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <span aria-hidden="true" className="text-4xl">
        ⚠️
      </span>
      <h1 className="text-lg font-bold">Aplikasi tidak bisa membuka data</h1>
      <p className="max-w-sm text-sm text-muted">{message}</p>
      <p className="max-w-sm text-xs text-muted">
        Coba tutup tab lain yang memakai aplikasi ini, lalu muat ulang. Data yang sudah tersimpan
        tidak dihapus.
      </p>
      <button type="button" onClick={() => window.location.reload()} className="btn-primary mt-2">
        Muat ulang
      </button>
    </div>
  );
}
