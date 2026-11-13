import { useApp, useAppState } from '../context.jsx';
import { AlertIcon, CheckIcon, CloseIcon } from './Icons.jsx';

const STYLES = {
  success: 'bg-income text-white',
  error: 'bg-expense text-white',
  warn: 'bg-warn text-white',
  info: 'bg-ink text-bg',
};

export default function Toast() {
  const { actions } = useApp();
  const { toast } = useAppState();

  if (!toast) return null;

  const style = STYLES[toast.kind] ?? STYLES.info;
  const Icon = toast.kind === 'success' ? CheckIcon : AlertIcon;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 pb-safe"
    >
      <div
        className={`toast pointer-events-auto flex max-w-md items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-semibold shadow-card ${style}`}
      >
        <Icon size={18} />
        <span className="line-clamp-2">{toast.message}</span>
        <button
          type="button"
          onClick={actions.dismissToast}
          aria-label="Tutup notifikasi"
          className="rounded-full p-0.5 opacity-70 transition hover:opacity-100"
        >
          <CloseIcon size={16} />
        </button>
      </div>
    </div>
  );
}
