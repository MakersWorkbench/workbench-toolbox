// Opens every tool in Chromium while OFFLINE and checks it renders and one calculation returns the expected value.
const { test, expect } = require('@playwright/test');

// Each case changes one input from its default and checks a result that is also easy to verify by hand.
const CASES = [
  { id: 'decoder', root: '#tmwb-dec', tabs: 14, act: async (r) => { await r.locator('.pane select').nth(1).selectOption('red'); }, expect: '1.2 kΩ' },       // brown, red, x100 = 1.2 kΩ
  { id: 'calculators', root: '#tmwb-calc', tabs: 20, act: async (r) => { await r.locator('.pane input').nth(1).fill('40m'); }, expect: '300 Ω' },              // 12 V / 40 mA = 300 Ω
  { id: 'embedded', root: '#tmwb-emb', tabs: 6, act: async (r) => { await r.locator('.pane input').nth(1).fill('256'); }, expect: '1.25 V' },                    // 10-bit, 5 V ref, 256 counts = 1.25 V
  { id: 'power', root: '#tmwb-pwr', tabs: 5, act: async (r) => { await r.locator('.pane input').nth(2).fill('100'); }, expect: '760 mW' },                     // (12-5) V x 0.1 A + 12 V x 5 mA = 0.76 W
  { id: 'pcb', root: '#tmwb-pcb', tabs: 5, act: async (r) => { await r.locator('.pane input').nth(0).fill('1'); }, expect: 'mm' },                                  // see numeric check below
  { id: 'bench', root: '#tmwb-bench', tabs: 6, act: async (r) => { await r.locator('.pane input').nth(0).fill('2.2k'); await r.locator('.pane select').nth(0).selectOption('Ω'); }, expect: '2.2 kΩ' }
];

test.describe.configure({ mode: 'serial' });

test('app installs its offline cache, then every tool works with no network', async ({ page, context, baseURL }) => {
  const external = [];
  page.on('request', (r) => { if (!r.url().startsWith(baseURL)) external.push(r.url()); });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();                                           // the worker now controls the page
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#homeBody .card')).toHaveCount(6);

  for (const c of CASES) {
    await page.goto(`/#/t/${c.id}`);
    const wrap = page.locator(`.toolwrap[data-tool="${c.id}"]`);
    await expect(wrap).toBeVisible();
    const root = wrap.locator(c.root);
    await expect(root.locator('.dec-title')).toBeVisible();
    await expect(root.locator('.tabbar button').first()).toBeVisible();
    expect(await root.locator('.tabbar button').count()).toBeGreaterThanOrEqual(c.tabs);
    await expect(root.locator('.pane')).not.toBeEmpty();
    await c.act(root);
    if (c.id === 'pcb') {
      // 1 A on 1 oz external copper, 10 C rise, needs a narrower trace than the 2 A default of 0.78 mm.
      const txt = await root.locator('.pane .results').first().innerText();
      const mm = parseFloat(txt.match(/Minimum trace width\s*([\d.]+) mm/)[1]);
      expect(mm).toBeGreaterThan(0.2); expect(mm).toBeLessThan(0.78);
    } else {
      await expect(root.locator('.pane')).toContainText(c.expect);
    }
  }
  expect(external, 'no network requests leave the app').toEqual([]);
  expect(errors, 'no console or page errors').toEqual([]);
});

test('every tab of every tool opens without errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  for (const c of CASES) {
    await page.goto(`/#/t/${c.id}`);
    const root = page.locator(`.toolwrap[data-tool="${c.id}"] ${c.root}`);
    await expect(root.locator('.tabbar button').first()).toBeVisible();
    const n = await root.locator('.tabbar button').count();
    for (let i = 0; i < n; i++) {
      await root.locator('.tabbar button').nth(i).click();
      await expect(root.locator('.pane')).not.toBeEmpty();
    }
  }
  expect(errors).toEqual([]);
});

test('favorites and recents are remembered', async ({ page }) => {
  await page.goto('/');
  await page.locator('.cardwrap').nth(2).locator('.fav').click();
  await page.goto('/#/t/power');
  await expect(page.locator('.toolwrap[data-tool="power"]')).toBeVisible();
  await page.goto('/#/');
  await expect(page.locator('h2.sec', { hasText: 'Favorites' })).toBeVisible();
  await expect(page.locator('h2.sec', { hasText: 'Recently used' })).toBeVisible();
});

test('Electronics Calculators is named correctly and the PCB tagline is right', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.card .name', { hasText: 'Electronics Calculators' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Circuit Calculators');
  await expect(page.locator('.card .desc', { hasText: 'Calculators for PCB traces, vias, spacing, and wire gauge' })).toBeVisible();
});

test.describe('phone layout at 360 px', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true });
  test('no sideways scroll and touch targets are at least 44 px', async ({ page }) => {
    const small = [];
    for (const route of ['/', '/#/about', ...CASES.map((c) => `/#/t/${c.id}`)]) {
      await page.goto(route);
      await page.waitForTimeout(250);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over, `${route} scrolls sideways`).toBeLessThanOrEqual(0);
      const bad = await page.evaluate(() => [...document.querySelectorAll('button, a.card, a.btn, select, input')]
        .filter((e) => e.offsetParent !== null)
        .map((e) => { const r = e.getBoundingClientRect(); return { t: (e.textContent || e.getAttribute('aria-label') || e.className || e.tagName).trim().slice(0, 30), h: Math.round(r.height), w: Math.round(r.width) }; })
        .filter((x) => x.h < 44 && x.h > 0));
      bad.forEach((b) => small.push(`${route}: "${b.t}" ${b.w}x${b.h}`));
    }
    expect(small, 'controls under 44 px tall').toEqual([]);
  });
});
