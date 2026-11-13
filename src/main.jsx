/**
 * Composition root — satu-satunya berkas yang merakit semua lapisan.
 * Tidak ada logika bisnis di sini.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { TABS, createActions, initialState } from './app/actions.js';
import { createStore } from './app/store.js';
import { createIdbAdapter } from './data/adapters/idb.js';
import { createMirror } from './data/adapters/mirror.js';
import { makeId, nowISO, todayISO } from './data/id.js';
import { createRepository } from './data/repository.js';
import { applySchema } from './data/schema.js';
import { getPersistedStatus } from './data/storage.js';
import App from './ui/App.jsx';

import './styles/index.css';

const store = createStore({ ...initialState });

const repository = createRepository({
  adapter: createIdbAdapter({ upgrade: applySchema }),
  mirror: createMirror(),
  makeId,
  now: nowISO,
});

const actions = createActions({
  repo: repository,
  store,
  now: nowISO,
  today: todayISO,
});

// Deep link dari shortcut PWA: /?aksi=pengeluaran
const params = new URLSearchParams(window.location.search);
const aksi = params.get('aksi');
if (aksi) {
  store.setState({ tab: TABS.SUMMARY });
}

const container = document.getElementById('root');
if (!container) throw new Error('Elemen #root tidak ditemukan.');

createRoot(container).render(
  <StrictMode>
    <App store={store} actions={actions} />
  </StrictMode>,
);

actions.init().catch((error) => {
  console.error('[uangku] inisialisasi gagal', error);
});

// Perbarui status persistensi saat aplikasi kembali dibuka.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    getPersistedStatus().catch(() => null);
  }
});
