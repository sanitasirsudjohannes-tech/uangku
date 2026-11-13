import { useEffect, useState } from 'react';
import { useApp, useAppState } from '../context.jsx';
import Sheet from '../components/Sheet.jsx';
import MoneyInput from '../components/MoneyInput.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { TYPES, validateTransactionInput } from '../../core/transaction.js';
import { TrashIcon } from '../components/Icons.jsx';

const EMPTY_DRAFT = {
  type: TYPES.EXPENSE,
  amount: '',
  categoryId: '',
  date: '',
  note: '',
};

export default function FormSheet({ form }) {
  const { actions, closeForm } = useApp();
  const state = useAppState();
  const { categories, today, busy, transactions } = state;

  const editing = form.editingId
    ? transactions.find((transaction) => transaction.id === form.editingId) ?? null
    : null;

  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!form.open) return;

    if (editing) {
      setDraft({
        type: editing.type,
        amount: String(editing.amount),
        categoryId: editing.categoryId,
        date: editing.date,
        note: editing.note ?? '',
      });
    } else {
      const type = form.presetType === TYPES.INCOME ? TYPES.INCOME : TYPES.EXPENSE;
      const first = categories.find((category) => category.type === type);
      setDraft({
        ...EMPTY_DRAFT,
        type,
        date: today,
        categoryId: first?.id ?? '',
      });
    }
    setErrors({});
    setConfirmDelete(false);
    // Reset hanya saat panel dibuka atau target transaksi berubah.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.open, form.editingId, form.presetType]);

  const visibleCategories = categories.filter((category) => category.type === draft.type);

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function changeType(nextType) {
    if (nextType === draft.type) return;
    const first = categories.find((category) => category.type === nextType);
    setDraft((current) => ({
      ...current,
      type: nextType,
      categoryId: first?.id ?? '',
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const candidate = {
      type: draft.type,
      amount: draft.amount ? Number(draft.amount) : 0,
      categoryId: draft.categoryId,
      date: draft.date,
      note: draft.note,
    };

    const check = validateTransactionInput(candidate);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }

    try {
      await actions.saveTransaction(check.value, { id: editing?.id });
      closeForm();
    } catch (error) {
      if (error.fieldErrors) setErrors(error.fieldErrors);
      else setErrors({ form: error.message ?? 'Gagal menyimpan.' });
    }
  }

  async function handleDelete() {
    if (!editing) return;
    setDeleting(true);
    try {
      await actions.deleteTransaction(editing.id);
      setConfirmDelete(false);
      closeForm();
    } catch {
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Sheet
        open={form.open}
        onClose={closeForm}
        title={editing ? 'Ubah transaksi' : 'Catat transaksi'}
        subtitle={editing ? 'Perubahan langsung tersimpan di perangkat.' : undefined}
        footer={
          <div className="flex items-center gap-2">
            {editing ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="btn-danger h-12 w-12 shrink-0 p-0"
                aria-label="Hapus transaksi"
              >
                <TrashIcon size={20} />
              </button>
            ) : null}
            <button
              type="submit"
              form="transaction-form"
              className="btn-primary h-12 flex-1 text-base"
              disabled={busy}
            >
              {busy ? 'Menyimpan…' : editing ? 'Simpan perubahan' : 'Simpan'}
            </button>
          </div>
        }
      >
        <form id="transaction-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <span className="label">Jenis</span>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
              <button
                type="button"
                onClick={() => changeType(TYPES.EXPENSE)}
                aria-pressed={draft.type === TYPES.EXPENSE}
                className={`rounded-lg py-2 text-sm font-bold transition ${
                  draft.type === TYPES.EXPENSE
                    ? 'bg-surface text-expense shadow-card'
                    : 'text-muted'
                }`}
              >
                Pengeluaran
              </button>
              <button
                type="button"
                onClick={() => changeType(TYPES.INCOME)}
                aria-pressed={draft.type === TYPES.INCOME}
                className={`rounded-lg py-2 text-sm font-bold transition ${
                  draft.type === TYPES.INCOME
                    ? 'bg-surface text-income shadow-card'
                    : 'text-muted'
                }`}
              >
                Pemasukan
              </button>
            </div>
          </div>

          <MoneyInput
            value={draft.amount}
            onChange={(digits) => update('amount', digits)}
            error={errors.amount}
            autoFocus={!editing}
          />

          <div>
            <span className="label">Kategori</span>
            <div className="-mx-1 flex flex-wrap gap-1.5">
              {visibleCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => update('categoryId', category.id)}
                  aria-pressed={draft.categoryId === category.id}
                  className={`chip ${draft.categoryId === category.id ? 'chip-active' : ''}`}
                >
                  <span aria-hidden="true">{category.emoji}</span>
                  {category.name}
                </button>
              ))}
            </div>
            {errors.categoryId ? (
              <p className="mt-1.5 text-xs font-medium text-expense">{errors.categoryId}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="transaction-date">
                Tanggal
              </label>
              <input
                id="transaction-date"
                type="date"
                value={draft.date}
                max={today}
                onChange={(event) => update('date', event.target.value)}
                className={`field ${errors.date ? 'field-error' : ''}`}
              />
              {errors.date ? (
                <p className="mt-1.5 text-xs font-medium text-expense">{errors.date}</p>
              ) : null}
            </div>
            <div>
              <label className="label" htmlFor="transaction-note">
                Catatan
              </label>
              <input
                id="transaction-note"
                type="text"
                value={draft.note}
                maxLength={200}
                placeholder="Opsional"
                onChange={(event) => update('note', event.target.value)}
                className={`field ${errors.note ? 'field-error' : ''}`}
              />
              {errors.note ? (
                <p className="mt-1.5 text-xs font-medium text-expense">{errors.note}</p>
              ) : null}
            </div>
          </div>

          {errors.form ? (
            <p className="rounded-xl bg-expense-soft px-3 py-2 text-xs font-semibold text-expense">
              {errors.form}
            </p>
          ) : null}

          <p className="pb-1 text-center text-[0.68rem] text-muted">
            Tersimpan lokal di perangkat ini, tanpa dikirim ke mana pun.
          </p>
        </form>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        title="Hapus transaksi ini?"
        message="Transaksi akan dihapus permanen dari perangkat. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Hapus"
        danger
        busy={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />
    </>
  );
}
