import { useRef, useState } from 'react';
import { useApp, useAppState } from '../context.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { formatBytes } from '../../data/storage.js';
import { formatRupiah } from '../../core/currency.js';
import {
  backupReminder,
  downloadText,
  formatDateTime,
  shortId,
} from '../lib/format.js';
import {
  AlertIcon,
  DownloadIcon,
  ShieldIcon,
  TrashIcon,
  UploadIcon,
  CheckIcon,
} from '../components/Icons.jsx';

const APP_VERSION = '1.0.0';

function Row({ label, value, hint }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint ? <p className="mt-0.5 text-[0.7rem] text-muted">{hint}</p> : null}
      </div>
      <p className="shrink-0 text-right text-sm font-semibold tabular">{value}</p>
    </div>
  );
}

function Card({ children }) {
  return <div className="card mb-3 divide-y divide-line px-4">{children}</div>;
}

export default function SettingsView() {
  const { actions } = useApp();
  const state = useAppState();
  const { diagnostics, storage, categories, lastImport, busy } = state;

  const fileInputRef = useRef(null);
  const [pendingImport, setPendingImport] = useState(null);
  const [importMode, setImportMode] = useState('merge');
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryType, setNewCategoryType] = useState('expense');
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  const reminder = backupReminder(storage.lastBackupAt);
  const usedBytes = storage.usage;

  async function handleExport() {
    const { filename, text } = await actions.exportBackup();
    downloadText(filename, text);
  }

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setPendingImport({ name: file.name, text });
    event.target.value = '';
  }

  async function runImport() {
    if (!pendingImport) return;
    await actions.importBackup(pendingImport.text, importMode).catch(() => {});
    setPendingImport(null);
    setConfirmReplace(false);
  }

  async function handleAddCategory(event) {
    event.preventDefault();
    const name = newCategory.trim();
    if (!name) return;
    const created = await actions.addCategory(name, newCategoryType).catch(() => null);
    if (created) setNewCategory('');
  }

  return (
    <div className="screen-fade px-4 pt-safe">
      <header className="mb-4">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-brand">Uangku</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Pengaturan</h1>
      </header>

      <h2 className="section-title">Data di perangkat</h2>
      <Card>
        <Row label="Jumlah transaksi" value={`${diagnostics?.transactionCount ?? 0} baris`} />
        <Row label="Jumlah kategori" value={`${diagnostics?.categoryCount ?? 0} kategori`} />
        <Row
          label="Ruang terpakai"
          value={formatBytes(usedBytes)}
          hint={storage.quota ? `dari kuota ${formatBytes(storage.quota)}` : 'kuota tidak terbaca browser'}
        />
        <Row
          label="Penyimpanan permanen"
          value={storage.persisted ? 'Aktif' : 'Belum aktif'}
          hint={
            storage.supported
              ? 'Agar browser tidak menghapus data saat penyimpanan menipis.'
              : 'Browser tidak mendukung Storage API.'
          }
        />
        <div className="py-3">
          <button
            type="button"
            onClick={() => actions.enablePersistence()}
            disabled={!storage.supported || storage.persisted}
            className="btn-primary w-full"
          >
            <ShieldIcon size={18} />
            {storage.persisted ? 'Data sudah dilindungi' : 'Aktifkan perlindungan data'}
          </button>
        </div>
      </Card>

      <h2 className="section-title">Cadangan</h2>
      <Card>
        <div className="flex items-start justify-between gap-3 py-3">
          <div>
            <p className="text-sm font-medium">Backup terakhir</p>
            <p className="mt-0.5 text-[0.7rem] text-muted">{formatDateTime(storage.lastBackupAt)}</p>
          </div>
          <span
            className={`shrink-0 rounded-pill px-2.5 py-1 text-[0.68rem] font-bold ${
              reminder.level === 'ok'
                ? 'bg-income-soft text-income'
                : reminder.level === 'warn'
                  ? 'bg-warn-soft text-warn'
                  : 'bg-expense-soft text-expense'
            }`}
          >
            {reminder.text}
          </span>
        </div>

        <div className="space-y-2 py-3">
          <button type="button" onClick={handleExport} className="btn-primary w-full" disabled={busy}>
            <DownloadIcon size={18} /> Ekspor cadangan JSON
          </button>

          <div className="flex items-center gap-1 rounded-xl bg-surface-2 p-1">
            {[
              { id: 'merge', label: 'Gabungkan' },
              { id: 'replace', label: 'Ganti semua' },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setImportMode(mode.id)}
                aria-pressed={importMode === mode.id}
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                  importMode === mode.id ? 'bg-surface text-ink shadow-card' : 'text-muted'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-ghost w-full"
            disabled={busy}
          >
            <UploadIcon size={18} /> Impor dari berkas
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFile}
            className="hidden"
          />

          <p className="px-1 text-[0.68rem] leading-relaxed text-muted">
            Mode gabungkan menambahkan yang belum ada dan memperbarui data dengan cap waktu lebih
            baru. Mode ganti semua menghapus transaksi lama lebih dulu.
          </p>
        </div>

        {lastImport ? (
          <div className="flex items-start gap-2 py-3 text-xs">
            <CheckIcon size={16} className="mt-0.5 shrink-0 text-income" />
            <p className="text-muted">
              Impor terakhir {formatDateTime(lastImport.at)}: {lastImport.transactions.added} baru,{' '}
              {lastImport.transactions.updated} diperbarui, {lastImport.transactions.kept} tetap.
            </p>
          </div>
        ) : null}

        {storage.mirror?.present ? (
          <div className="flex items-start gap-2 py-3 text-xs">
            <AlertIcon size={16} className="mt-0.5 shrink-0 text-warn" />
            <p className="text-muted">
              Ada salinan otomatis di penyimpanan lokal. Berguna bila database utama terhapus.
            </p>
          </div>
        ) : null}
      </Card>

      <h2 className="section-title">Kategori</h2>
      <Card>
        <form onSubmit={handleAddCategory} className="space-y-2 py-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategory}
              maxLength={24}
              onChange={(event) => setNewCategory(event.target.value)}
              placeholder="Nama kategori baru"
              className="field flex-1"
            />
            <select
              value={newCategoryType}
              onChange={(event) => setNewCategoryType(event.target.value)}
              className="field w-32 shrink-0"
              aria-label="Jenis kategori"
            >
              <option value="expense">Keluar</option>
              <option value="income">Masuk</option>
            </select>
          </div>
          <button type="submit" className="btn-ghost w-full" disabled={!newCategory.trim()}>
            Tambah kategori
          </button>
        </form>

        <div className="py-2">
          {['expense', 'income'].map((type) => (
            <div key={type} className="py-1.5">
              <p className="mb-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-muted">
                {type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {categories
                  .filter((category) => category.type === type)
                  .map((category) => (
                    <span
                      key={category.id}
                      className="chip cursor-default py-1.5 text-xs"
                    >
                      <span aria-hidden="true">{category.emoji}</span>
                      {category.name}
                      {!category.system ? (
                        <button
                          type="button"
                          onClick={() => setCategoryToDelete(category)}
                          aria-label={`Hapus kategori ${category.name}`}
                          className="-mr-1 ml-0.5 rounded-full p-0.5 text-muted transition hover:text-expense"
                        >
                          <TrashIcon size={13} />
                        </button>
                      ) : null}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <h2 className="section-title">Tentang</h2>
      <Card>
        <Row label="Versi aplikasi" value={APP_VERSION} />
        <Row label="Versi skema data" value={`v${diagnostics?.schemaVersion ?? 1}`} />
        <Row label="Mesin penyimpanan" value={diagnostics?.adapterKind ?? '—'} />
        <Row
          label="ID perangkat"
          value={shortId(diagnostics?.deviceId)}
          hint="Dipakai untuk membedakan perangkat bila sinkronisasi ditambahkan."
        />
      </Card>

      <p className="mb-6 px-2 text-center text-[0.68rem] leading-relaxed text-muted">
        Uangku menyimpan semua data di perangkat ini. Tidak ada server, tidak ada akun. Backup
        berkala adalah satu-satunya cara memindahkan data ke perangkat lain.
      </p>

      <ConfirmDialog
        open={Boolean(pendingImport) && importMode === 'replace'}
        title="Ganti semua data?"
        message={`Semua transaksi saat ini akan dihapus lalu diganti dengan isi berkas ${pendingImport?.name ?? ''}.`}
        confirmLabel="Ganti data"
        danger
        busy={busy}
        onCancel={() => {
          setPendingImport(null);
          setConfirmReplace(false);
        }}
        onConfirm={runImport}
      />

      <ConfirmDialog
        open={Boolean(pendingImport) && importMode === 'merge'}
        title="Impor cadangan?"
        message={`Berkas ${pendingImport?.name ?? ''} akan digabungkan dengan data di perangkat ini.`}
        confirmLabel="Impor"
        busy={busy}
        onCancel={() => setPendingImport(null)}
        onConfirm={runImport}
      />

      <ConfirmDialog
        open={Boolean(categoryToDelete)}
        title={`Hapus kategori ${categoryToDelete?.name ?? ''}?`}
        message="Kategori hanya bisa dihapus jika belum dipakai transaksi."
        confirmLabel="Hapus"
        danger
        onCancel={() => setCategoryToDelete(null)}
        onConfirm={async () => {
          if (categoryToDelete) await actions.removeCategory(categoryToDelete.id).catch(() => {});
          setCategoryToDelete(null);
        }}
      />
    </div>
  );
}
