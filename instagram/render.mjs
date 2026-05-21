/**
 * Render Instagram carousel slides to 1080x1350 PNGs.
 *
 * Usage:
 *   cd website && npm install --no-save playwright   (one-time)
 *   node instagram/render.mjs
 *
 * Writes slide-1.png through slide-5.png next to carousel.html. Each slide
 * is screenshotted at its element bounds so the inter-slide gap and any
 * scroll position don't leak into the export. Fonts are loaded from Google
 * Fonts; the script waits for the fontfaceobserver-style ready state
 * before screenshotting so Nunito is fully applied (avoiding fallback-font
 * exports).
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const HTML = `file://${join(HERE, 'carousel.html')}`;
const SLIDE_W = 1080;
const SLIDE_H = 1350;
const SLIDES = 5;

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: SLIDE_W, height: SLIDE_H },
  deviceScaleFactor: 2, // 2x DPI — sharper text/icons on phone displays
});
const page = await ctx.newPage();

await page.goto(HTML, { waitUntil: 'networkidle' });
// Belt-and-braces: wait until *all* @font-face declarations have actually
// loaded. networkidle alone fires before fonts complete decode/apply.
await page.evaluate(() => document.fonts.ready);

for (let i = 1; i <= SLIDES; i++) {
  const sel = `#slide-${i}`;
  const el = await page.$(sel);
  if (!el) {
    console.error(`Slide ${i} not found (${sel})`);
    continue;
  }
  const out = join(HERE, `slide-${i}.png`);
  await el.screenshot({ path: out, omitBackground: false });
  console.log(`✓ ${out}`);
}

await browser.close();
