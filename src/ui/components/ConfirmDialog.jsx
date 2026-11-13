export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Ya, lanjutkan',
  cancelLabel = 'Batal',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-5">
      <button
        type="button"
        aria-label="Batal"
        onClick={onCancel}
        className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="pop card relative w-full max-w-sm p-5"
      >
        <h3 className="text-base font-bold">{title}</h3>
        <p className="mt-1.5 text-sm text-muted">{message}</p>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onCancel} className="btn-ghost flex-1" disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`flex-1 ${danger ? 'btn-danger' : 'btn-primary'}`}
          >
            {busy ? 'Memproses…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
