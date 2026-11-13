import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const layer = (name) =>
  fileURLToPath(new URL(`./src/${name}`, import.meta.url));

/**
 * GitHub Pages menyajikan repo ini sebagai project site, sehingga
 * aplikasi hidup di https://<pemilik>.github.io/uangku/ — bukan di root
 * domain. Semua URL manifest dan service worker harus ikut awalan ini.
 */
const BASE = '/uangku/';

export default defineConfig({
  base: BASE,
  resolve: {
    alias: {
      '#core': layer('core'),
      '#data': layer('data'),
      '#app': layer('app'),
      '#ui': layer('ui'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        id: BASE,
        name: 'Uangku — Catatan Keuangan',
        short_name: 'Uangku',
        description:
          'Catatan pemasukan dan pengeluaran harian. Data tersimpan di perangkat, bekerja penuh saat offline.',
        lang: 'id',
        dir: 'ltr',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f8fafc',
        theme_color: '#0f766e',
        categories: ['finance', 'productivity', 'utilities'],
        icons: [
          { src: `${BASE}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${BASE}icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
          {
            src: `${BASE}icons/icon-maskable-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Catat pengeluaran',
            short_name: 'Pengeluaran',
            url: `${BASE}?aksi=pengeluaran`,
            icons: [{ src: `${BASE}icons/icon-192.png`, sizes: '192x192' }],
          },
          {
            name: 'Catat pemasukan',
            short_name: 'Pemasukan',
            url: `${BASE}?aksi=pemasukan`,
            icons: [{ src: `${BASE}icons/icon-192.png`, sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest,woff2}'],
        navigateFallback: `${BASE}index.html`,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
