/**
 * Store terpusat minimalis.
 * Kontraknya cocok dengan React `useSyncExternalStore`:
 * `subscribe` stabil dan `getState` mengembalikan referensi yang sama
 * selama state tidak berubah.
 */
export function createStore(initialState = {}) {
  let state = { ...initialState };
  const listeners = new Set();

  const getState = () => state;

  const subscribe = (listener) => {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const setState = (patch) => {
    const next = typeof patch === 'function' ? patch(state) : patch;
    if (!next || typeof next !== 'object') return state;

    let changed = false;
    for (const key of Object.keys(next)) {
      if (!Object.is(state[key], next[key])) {
        changed = true;
        break;
      }
    }
    if (!changed) return state;

    state = { ...state, ...next };
    for (const listener of [...listeners]) {
      try {
        listener(state);
      } catch (error) {
        // Satu listener gagal tidak boleh menghentikan listener lain.
        console.error('[store] listener error', error);
      }
    }
    return state;
  };

  return { getState, subscribe, setState };
}
