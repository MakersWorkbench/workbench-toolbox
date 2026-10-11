#!/usr/bin/env node
// Renders the app icons from one SVG design (navy tile, blue hex nut, resistor zigzag) using headless Chromium.
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'www/icons'); mkdirSync(OUT, { recursive: true });

const art = `<polygon points="256,86 403,171 403,341 256,426 109,341 109,171" fill="#3979f4"/>
<circle cx="256" cy="256" r="88" fill="#0D2B5E"/>
<path d="M178 256h40l16-38 32 76 16-38h40" fill="none" stroke="#fff" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>`;
const svg = (rx) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><rect width="512" height="512" rx="${rx}" fill="#0D2B5E"/>${art}</svg>`;
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
await png('icon-maskable-512.png', 512, svg(0), false);
await png('apple-touch-icon.png', 180, svg(0), false);
await png('favicon-32.png', 32, svg(7), true);
await browser.close();
console.log('icons written to www/icons');
