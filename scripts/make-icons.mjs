#!/usr/bin/env node
// Renders the app icons from one SVG design (navy tile, blue hex nut, resistor zigzag) using headless Chromium.
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'www/icons'); mkdirSync(OUT, { recursive: true });

// The Makers Workbench mark (www/img/mark.png) on a white tile with a navy edge.
const markUri = 'data:image/png;base64,' + readFileSync(join(ROOT, 'www/img/mark.png')).toString('base64');
const svg = (rx, pad = 0.12) => { const m = 512 * (1 - 2 * pad); return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><rect width="512" height="512" rx="${rx}" fill="#0D2B5E"/><rect x="14" y="14" width="484" height="484" rx="${Math.max(rx - 10, 0)}" fill="#ffffff"/><image href="${markUri}" x="${512 * pad}" y="${512 * pad}" width="${m}" height="${m}"/></svg>`; };
writeFileSync(join(OUT, 'icon.svg'), svg(112) + '\n');

const exe = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
const browser = await chromium.launch({ executablePath: exe });
async function png(name, size, markup, transparent) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<html><body style="margin:0;background:transparent">${markup.replace('width="512" height="512"', `width="${size}" height="${size}"`)}</body></html>`);
  writeFileSync(join(OUT, name), await page.screenshot({ omitBackground: transparent }));
  await page.close();
}
await png('icon-192.png', 192, svg(42), true);
await png('icon-512.png', 512, svg(112), true);
await png('icon-maskable-512.png', 512, svg(0, 0.2), false);
await png('apple-touch-icon.png', 180, svg(0, 0.16), false);
await png('favicon-32.png', 32, svg(7), true);
await browser.close();
console.log('icons written to www/icons');
