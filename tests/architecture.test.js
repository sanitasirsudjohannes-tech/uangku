/**
 * Penjaga arsitektur: memastikan aturan lapisan benar-benar dipatuhi
 * oleh kode sumber, bukan hanya oleh dokumen.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

const LAYER_INDEX = { core: 0, data: 1, app: 2, ui: 3 };
const ROOT_LAYER = 99;

function walk(dir) {
  const entries = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) entries.push(...walk(full));
    else if (/\.(js|jsx)$/.test(name)) entries.push(full);
  }
  return entries;
}

function layerOf(file) {
  const parts = relative(SRC, file).split(sep);
  return LAYER_INDEX[parts[0]] === undefined ? 'root' : parts[0];
}

function importSpecifiers(source) {
  const found = new Set();
  const patterns = [
    /from\s+['"]([^'"]+)['"]/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /import\s+['"]([^'"]+)['"]/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source)) !== null) found.add(match[1]);
  }
  return [...found];
}

/** Memetakan specifier ke lapisan tujuan, atau null bila paket eksternal. */
function targetLayer(specifier, fromFile) {
  if (specifier.startsWith('#core/')) return 'core';
  if (specifier.startsWith('#data/')) return 'data';
  if (specifier.startsWith('#app/')) return 'app';
  if (specifier.startsWith('#ui/')) return 'ui';

  if (specifier.startsWith('.')) {
    const target = resolve(dirname(fromFile), specifier);
    if (!target.startsWith(SRC)) return null;
    return layerOf(target);
  }
  return null;
}

const files = walk(SRC);

test('setiap berkas sumber dapat dipetakan ke satu lapisan', () => {
  assert.ok(files.length > 0);
  for (const file of files) {
    const layer = layerOf(file);
    assert.ok(
      layer === 'root' || layer in LAYER_INDEX,
      `Berkas ${relative(ROOT, file)} berada di luar lapisan yang dikenal.`,
    );
  }
});

test('impor hanya boleh mengarah ke lapisan yang sama atau di bawahnya', () => {
  const problems = [];

  for (const file of files) {
    const ownLayer = layerOf(file);
    const ownIndex = ownLayer === 'root' ? ROOT_LAYER : LAYER_INDEX[ownLayer];
    const source = readFileSync(file, 'utf8');

    for (const specifier of importSpecifiers(source)) {
      const target = targetLayer(specifier, file);
      if (target === null) continue;
      const targetIndex = target === 'root' ? ROOT_LAYER : LAYER_INDEX[target];

      if (targetIndex > ownIndex) {
        problems.push(
          `${relative(ROOT, file)} (${ownLayer}) mengimpor ${specifier} (${target}) — arah terbalik.`,
        );
      }
    }
  }

  assert.deepEqual(problems, []);
});

test('React hanya boleh dipakai di lapisan ui', () => {
  const problems = [];

  for (const file of files) {
    const layer = layerOf(file);
    if (layer === 'ui' || layer === 'root') continue;
    const source = readFileSync(file, 'utf8');
    for (const specifier of importSpecifiers(source)) {
      if (/^react(-dom)?($|\/)/.test(specifier)) {
        problems.push(`${relative(ROOT, file)} mengimpor ${specifier}.`);
      }
    }
  }

  assert.deepEqual(problems, []);
});

test('localStorage hanya disentuh adapter cermin', () => {
  const problems = [];
  for (const file of files) {
    const rel = relative(SRC, file).split(sep).join('/');
    if (rel === 'data/adapters/mirror.js') continue;
    const source = readFileSync(file, 'utf8');
    if (/\blocalStorage\b/.test(source)) problems.push(rel);
  }
  assert.deepEqual(problems, []);
});

test('document dan window hanya dipakai lapisan ui', () => {
  const problems = [];
  for (const file of files) {
    const layer = layerOf(file);
    if (layer === 'ui' || layer === 'root') continue;
    const source = readFileSync(file, 'utf8');
    if (/\bdocument\./.test(source) || /\bwindow\./.test(source)) {
      problems.push(relative(ROOT, file));
    }
  }
  assert.deepEqual(problems, []);
});

test('core tetap deterministik: tanpa Date.now() atau new Date() tanpa argumen', () => {
  const problems = [];
  for (const file of files) {
    if (layerOf(file) !== 'core') continue;
    const source = readFileSync(file, 'utf8');
    if (/Date\.now\s*\(/.test(source)) problems.push(`${relative(ROOT, file)} memakai Date.now().`);
    if (/new Date\(\s*\)/.test(source)) problems.push(`${relative(ROOT, file)} memakai new Date().`);
  }
  assert.deepEqual(problems, []);
});

test('lapisan core tidak menyentuh storage atau navigator', () => {
  const problems = [];
  for (const file of files) {
    if (layerOf(file) !== 'core') continue;
    const source = readFileSync(file, 'utf8');
    if (/\bindexedDB\b|\bnavigator\b|\bsetTimeout\b/.test(source)) {
      problems.push(relative(ROOT, file));
    }
  }
  assert.deepEqual(problems, []);
});
