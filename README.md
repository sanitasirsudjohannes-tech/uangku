# uangku

PWA catatan pemasukan/pengeluaran yang bekerja penuh offline. Semua data disimpan di
perangkat (IndexedDB), tanpa server dan tanpa akun.

- **URL produksi:** <https://sanitasirsudjohannes-tech.github.io/uangku/>
- **Repo:** <https://github.com/sanitasirsudjohannes-tech/uangku>
- **Package ID APK:** `io.github.sanitasi.uangku`
- **Stack:** React 19 + Tailwind CSS v4 + Vite, arsitektur berlapis
- **Database:** IndexedDB (`uangku` v1) + cermin cadangan di localStorage

---

## 1. Menjalankan

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # hasil statis di dist/
npm run preview    # uji hasil build + service worker
npm test           # tes otomatis: core, data, app, arsitektur
npm run icons      # regenerasi ikon PWA (PNG dibuat tanpa library)
```

Butuh Node.js 20+ (dikembangkan dengan Node 24).

---

## 2. Arsitektur Berlapis

Aturan dependensi satu arah:

```
ui (React)  ──▶  app  ──▶  data  ──▶  core
```

| Lapisan | Tanggung jawab | Larangan |
| --- | --- | --- |
| `src/core` | entitas transaksi, validasi, agregasi dan analisis bulanan, format Rupiah, periode | React, DOM, storage, `Date.now()` |
| `src/data` | adapter IndexedDB/memory/mirror, skema, migrasi, repository, backup | React, DOM |
| `src/app` | satu store terpusat, actions (use case), selectors | React, DOM |
| `src/ui` | React + Tailwind: view, komponen, hook store | akses `localStorage` langsung |
| `src/main.jsx` | composition root: merakit semua lapisan | logika bisnis |

Aturan ini **diuji otomatis** di `tests/architecture.test.js`, sehingga pelanggaran
langsung menggagalkan `npm test`.

```
src/
├─ core/          transaction.js  summary.js  analytics.js  currency.js  period.js
├─ data/          adapters/{idb,memory,mirror}.js  schema.js  migrations.js
│                 repository.js  backup.js  storage.js  id.js
├─ app/           store.js  actions.js  selectors.js
├─ ui/            App.jsx  context.jsx  components/  views/  lib/
├─ styles/        index.css  tokens.css  base.css  views.css
└─ main.jsx
```

Alias impor (`#core/...`, `#data/...`, `#app/...`, `#ui/...`) dipakai di seluruh
`src` dan dikenali oleh Vite maupun `node --test`.

---

## 3. Skema Data

```
DB "uangku" versi 1
├─ transactions  keyPath: id
│   ├─ index by_month     -> "2026-11"
│   ├─ index by_category  -> categoryId
│   └─ index by_date      -> "2026-11-13"
├─ categories    keyPath: id
└─ meta          keyPath: key   (schemaVersion, deviceId, lastBackupAt, createdAt)
```

- Nominal disimpan sebagai **integer rupiah** (tanpa desimal) untuk menghindari galat pembulatan.
- Tanggal disimpan sebagai string ISO `YYYY-MM-DD`; `month` disimpan redundan agar filter bulan
  memakai index.
- Setiap transaksi punya `createdAt` dan `updatedAt` agar penggabungan data (merge) dan
  sinkronisasi di masa depan tetap mungkin.
- `deviceId` disimpan di `meta` untuk membedakan asal perangkat.

Ukuran: ±250–350 byte per transaksi. Kuota Chrome ±60% kapasitas disk, jadi ribuan
transaksi tidak menjadi masalah. `getAll()` seluruh isi hanya dipakai saat ekspor cadangan;
tampilan selalu memakai index `by_month`.

---

## 4. Fitur

- Tambah, ubah, hapus transaksi (nominal, kategori, catatan, tanggal)
- Ringkasan bulanan: masuk, keluar, saldo, pengeluaran teratas
- **Analisis dasar:** tren 3/6/12 bulan, perbandingan pengeluaran, rata-rata bulanan, kategori terbesar, dan insight otomatis
- Riwayat per bulan, dikelompokkan per tanggal, paginasi 50 baris
- Kategori bawaan + kategori buatan sendiri (per jenis, tidak bisa duplikat)
- Ekspor/impor cadangan JSON dengan mode **gabungkan** (merge by `id`, `updatedAt` terbaru menang)
  atau **ganti semua**
- Cermin cadangan otomatis di localStorage (dilewati bila > 1 MB)
- Panel diagnostik: jumlah baris, kuota, status penyimpanan permanen, versi skema
- Dark mode otomatis mengikuti sistem, layout aman untuk notch (safe-area)
- Offline penuh lewat service worker; installable di Android

---

## 5. Deploy ke GitHub Pages

Repo ini adalah **project site**, jadi aplikasi disajikan dari subfolder, bukan dari root
domain.

- **URL:** <https://sanitasirsudjohannes-tech.github.io/uangku/>
- **Repo:** <https://github.com/sanitasirsudjohannes-tech/uangku>

`vite.config.js` memakai `const BASE = '/uangku/'`. Manifest, ikon, shortcut, dan service
worker semuanya mengikuti awalan itu. Kalau repo diganti nama, ubah konstanta tersebut lalu
build ulang — tanpa itu halaman akan tampil kosong karena aset 404.

1. Push kode (repo sudah dibuat kosong di GitHub):
   ```bash
   git remote add origin https://github.com/sanitasirsudjohannes-tech/uangku.git
   git push -u origin main
   ```
2. Di GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Workflow `.github/workflows/deploy.yml` menjalankan tes, build, lalu deploy otomatis
   setiap push ke `main`.
4. Buka <https://sanitasirsudjohannes-tech.github.io/uangku/> di Chrome Android → menu →
   **Install app**.

Karena aplikasi berada di subfolder, `assetlinks.json` untuk APK **tidak bisa** diletakkan di
repo ini — berkas itu wajib ada di root domain. Tempatnya di repo terpisah
`sanitasirsudjohannes-tech.github.io` (lihat bagian 6).

---

## 6. Membuat APK (PWABuilder, tanpa Android Studio)

1. Pastikan situs sudah live dan lolos `npm run build`.
2. Buka <https://www.pwabuilder.com>, masukkan `https://sanitasirsudjohannes-tech.github.io/uangku/`.
3. Pilih **Android** → Package ID `io.github.sanitasi.uangku` → **Generate**.
4. Unduh **APK** (untuk dipasang manual) dan **simpan `signing.keystore` + password-nya di dua
   tempat**. Tanpa file itu, APK tidak bisa diperbarui — harus ganti package ID dan install ulang.
5. Pasang APK di HP (izinkan "instal dari sumber tidak dikenal").
6. Di PWABuilder, salin **SHA-256 fingerprint** sertifikat. Karena situs berada di subfolder,
   berkas verifikasi harus diletakkan di root domain lewat repo **kedua** bernama
   `sanitasirsudjohannes-tech.github.io`:

   ```
   .nojekyll
   index.html                        (pengalih ke /uangku/)
   .well-known/assetlinks.json       (isi mengikuti assetlinks.template.json)
   ```

   ```json
   [
     {
       "relation": ["delegate_permission/common.handle_all_urls"],
       "target": {
         "namespace": "android_app",
         "package_name": "io.github.sanitasi.uangku",
         "sha256_cert_fingerprints": ["XX:XX:..."]
       }
     }
   ]
   ```
7. Aktifkan Pages untuk repo root itu, lalu buka APK. Bila verifikasi berhasil, address bar
   tidak muncul.

Catatan:

- APK dari PWABuilder adalah **Trusted Web Activity**: tetap memuat situs live, jadi update
  fitur cukup push ke repo `uangku`. APK hanya perlu dibuat ulang bila ikon/nama/package berubah.
- Data APK dan PWA memakai origin yang sama di Chrome, sehingga catatan lama tetap terbaca.
- Kedua repo memerlukan `.nojekyll` agar berkas berawalan titik (`.well-known`) tetap disajikan.
- Verifikasi bisa dicek di
  <https://sanitasirsudjohannes-tech.github.io/.well-known/assetlinks.json> — harus mengembalikan
  JSON, bukan 404.

---

## 7. Cadangan dan Pindah Perangkat

Data **tidak** tersinkron otomatis antar perangkat. Untuk memindahkan:

1. Di HP lama: **Pengaturan → Ekspor cadangan JSON**.
2. Kirim berkas (WhatsApp/Drive) ke HP baru.
3. Di HP baru: pilih mode **Gabungkan** atau **Ganti semua** → **Impor dari berkas**.

Membersihkan data situs di Chrome akan menghapus database. Karena itu:

- Aktifkan **penyimpanan permanen** di Pengaturan (mencegah penghapusan otomatis saat storage menipis).
- Lakukan ekspor berkala; panel Pengaturan mengingatkan bila sudah 7/30 hari tanpa backup.

---

## 8. Privasi

Tidak ada server, tidak ada akun, dan tidak ada layanan analitik pihak ketiga. Analisis keuangan dihitung lokal dari transaksi di perangkat. Data tidak pernah keluar dari perangkat kecuali Anda sendiri mengekspornya.

---

## 9. Pemecahan Masalah

| Gejala | Penyebab & solusi |
| --- | --- |
| Layar "Menyiapkan catatan keuangan…" tidak selesai | Tab lain masih memegang database versi lama. Tutup tab aplikasi lain lalu muat ulang. |
| Perubahan kode tidak muncul setelah build | Service worker menyajikan cache lama. Tutup semua tab aplikasi, atau DevTools → Application → Service Workers → Unregister. |
| Tombol "Install app" tidak muncul | Harus HTTPS dan manifest + service worker valid. `localhost` juga dianggap aman. |
| Halaman putih setelah deploy | `base` di `vite.config.js` tidak cocok dengan nama repo. Untuk project site harus `'/uangku/'`. |
| APK masih menampilkan address bar | `assetlinks.json` belum ada di root domain (repo `sanitasirsudjohannes-tech.github.io`) atau fingerprint-nya salah. |
| Data hilang setelah "clear browsing data" | Pembersihan situs menghapus IndexedDB. Pulihkan dari cermin (jika ada) atau impor cadangan JSON. |

---

## 10. Lisensi

Kode ini dibuat untuk pemakaian pribadi Pemilik. Silakan sesuaikan.
