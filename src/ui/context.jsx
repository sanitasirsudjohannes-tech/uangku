import { createContext, useContext, useSyncExternalStore } from 'react';

export const AppContext = createContext(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp harus dipakai di dalam <AppContext.Provider>.');
  }
  return context;
}

/**
 * Berlangganan ke store terpusat. Seluruh state dikembalikan apa adanya;
 * setiap view mengambil bagian yang dibutuhkannya sendiri.
 */
export function useAppState() {
  const { store } = useApp();
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
