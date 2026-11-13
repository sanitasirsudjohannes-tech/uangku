import { useEffect, useRef } from 'react';
import { CloseIcon } from './Icons.jsx';

/**
 * Panel bawah (bottom sheet) dengan fokus awal, tutup via backdrop,
 * tombol close, dan Escape.
 */
export default function Sheet({ open, onClose, title, subtitle, children, footer }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Tutup panel"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="sheet-panel relative flex max-h-[92dvh] w-full max-w-md flex-col"
      >
        <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="btn-quiet h-9 w-9 shrink-0 rounded-full p-0"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" aria-hidden="true" />
          {children}
        </div>

        {footer ? (
          <div className="border-t border-line px-5 pb-safe pt-3">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
