import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import test from 'node:test';

test('release includes the audited browser SPA bundle', async () => {
  const metadata = JSON.parse(await readFile(new URL('../assets/astronomy/metadata/sunrise-sunset-js.json', import.meta.url)));
  const bundle = await readFile(new URL('../' + metadata.browserBundle, import.meta.url));
  assert.equal(createHash('sha256').update(bundle).digest('hex'), metadata.browserBundleSha256);
  const { getSpaEvents } = await import('../src/astronomy/solar-spa.js');
  const sunrise = getSpaEvents('2026-06-21', { latitude: 39.9042, longitude: 116.4047 }).sunrise;
  assert.equal(sunrise.toISOString().slice(0, 16), '2026-06-20T20:46');
});

test('all static module imports in the browser entry graph resolve', async () => {
  const seen = new Set();
  async function visit(url) {
    url.search = '';
    if (seen.has(url.href)) return;
    seen.add(url.href);
    const source = await readFile(url, 'utf8');
    for (const match of source.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
      if (match[1].startsWith('.')) await visit(new URL(match[1], url));
    }
  }
  await visit(new URL('../src/js/main.js', import.meta.url));
  assert.ok(seen.size >= 5);
});

test('shared browser mask matches its original source and generated artifact hashes', async () => {
  const metadata = JSON.parse(await readFile(new URL('../assets/map/metadata/browser-land-mask.json', import.meta.url)));
  for (const [path, expected] of [[metadata.source, metadata.sourceSha256], [metadata.output, metadata.outputSha256]]) {
    const bytes = await readFile(new URL('../' + path, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected);
  }
});
