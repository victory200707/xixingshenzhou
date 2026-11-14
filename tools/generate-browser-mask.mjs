// Freeze the existing Chromium fallback rasterization for every engine.
// No new geometry or source dataset is introduced.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const sourcePath = 'assets/map/svg/presentation-coastline.svg';
const source = await readFile(sourcePath);
const implementation = await readFile('src/astronomy/solar-field.js', 'utf8');
const start = implementation.indexOf('function createLineworkFillMask(');
const end = implementation.indexOf('\nfunction loadTerrainTexture', start);
const algorithm = implementation.slice(start, end);
const browser = await chromium.launch({ headless: true });
try {
 const page = await browser.newPage();
 const png = await page.evaluate(async ({ svg, algorithm }) => {
  const image = new Image();
  image.src = 'data:image/svg+xml;base64,' + svg;
  await image.decode();
  const render = new Function('image', 'const VIEWBOX={width:3025.3333,height:2137.3333}; let lineworkFillMaskCache=null; ' + algorithm + '; return createLineworkFillMask(image);');
  return render(image).toDataURL('image/png').split(',')[1];
 }, { svg: source.toString('base64'), algorithm });
 const output = Buffer.from(png, 'base64');
 await writeFile('assets/map/raster/browser-land-mask.png', output);
 const hash = data => createHash('sha256').update(data).digest('hex');
 await writeFile('assets/map/metadata/browser-land-mask.json', JSON.stringify({
  purpose: 'Display-only raster cache of existing linework fill; not a geographic source or new map geometry.',
  source: sourcePath, sourceSha256: hash(source),
  algorithm: 'Existing createLineworkFillMask at source@5360ccb; same 0.125 scale, morphology and component selection.',
  algorithmSha256: hash(algorithm), generator: 'tools/generate-browser-mask.mjs',
  generatedOn: '2026-11-14', engine: await browser.version(), width:378,height:267,
  output:'assets/map/raster/browser-land-mask.png', outputSha256:hash(output),
 },null,2)+'\n');
 console.log('Generated shared browser mask:', output.length, 'bytes');
} finally { await browser.close(); }
