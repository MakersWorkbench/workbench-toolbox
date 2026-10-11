#!/usr/bin/env node
// Takes screenshots of home, About and every tool at phone and desktop width, dark and light, into screenshots/.
// Also reports any page that scrolls sideways at phone width.
import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { startServer } from './serve.mjs';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'screenshots'); mkdirSync(OUT, { recursive: true });
const cfg = JSON.parse(readFileSync(join(ROOT, 'scripts/tools.config.json'), 'utf8'));
const srv = await startServer(0); const base = `http://127.0.0.1:${srv.address().port}/`;
const browser = await chromium.launch({ executablePath: existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
const sizes = { phone: { width: 360, height: 740 }, desktop: { width: 1280, height: 800 } };
const problems = [];
for (const scheme of ['dark', 'light']) for (const [sname, vp] of Object.entries(sizes)) {
  const ctx = await browser.newContext({ viewport: vp, colorScheme: scheme, deviceScaleFactor: sname === 'phone' ? 2 : 1, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const targets = [['home', ''], ['about', '#/about'], ...cfg.tools.map((t) => [t.id, `#/t/${t.id}`])];
  for (const [name, hash] of targets) {
    await page.goto(base + hash); await page.waitForTimeout(300);
    if (hash.startsWith('#/t/')) await page.waitForSelector('.toolwrap:not([hidden]) .tabbar button');
    await page.waitForTimeout(150);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (sname === 'phone' && over > 0) problems.push(`${scheme} ${name}: horizontal overflow ${over}px`);
    await page.screenshot({ path: join(OUT, `${name}-${sname}-${scheme}.png`), fullPage: false });
  }
  await ctx.close();
}
await browser.close(); srv.close();
console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'No horizontal overflow at 360px.');
