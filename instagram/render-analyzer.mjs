/**
 * Render the analyzer-themed Instagram carousel to 1080x1350 PNGs.
 * Same pipeline as render.mjs but targets carousel-analyzer.html and
 * writes to analyzer-slide-1.png .. analyzer-slide-5.png so the prior
 * carousel exports stay untouched.
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const HTML = `file://${join(HERE, 'carousel-analyzer.html')}`;
const SLIDE_W = 1080;
const SLIDE_H = 1350;
const SLIDES = 5;

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: SLIDE_W, height: SLIDE_H },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

await page.goto(HTML, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

for (let i = 1; i <= SLIDES; i++) {
  const sel = `#slide-${i}`;
  const el = await page.$(sel);
  if (!el) {
    console.error(`Slide ${i} not found (${sel})`);
    continue;
  }
  const out = join(HERE, `analyzer-slide-${i}.png`);
  await el.screenshot({ path: out, omitBackground: false });
  console.log(`✓ ${out}`);
}

await browser.close();
