// Repo-wide rules: no em-dash characters anywhere, and the generated service worker is current.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const SKIP = new Set(['node_modules', '.git', 'test-results', 'playwright-report', 'target', 'build', 'dist']);
const TEXT = /\.(md|txt|js|mjs|cjs|css|html|json|webmanifest|yml|yaml|toml|rs|svg|xml|gradle|properties|swift|kt|java)$/i;

function walk(d, out) {
  for (const n of fs.readdirSync(d)) {
    if (SKIP.has(n)) continue;
    const p = path.join(d, n);
    if (fs.statSync(p).isDirectory()) walk(p, out); else if (TEXT.test(n)) out.push(p);
  }
  return out;
}

test('no em-dash characters in the repo', () => {
  const bad = walk(ROOT, []).filter((f) => !f.endsWith('package-lock.json') && fs.readFileSync(f, 'utf8').includes(String.fromCharCode(0x2014))).map((f) => path.relative(ROOT, f));
  assert.deepStrictEqual(bad, []);
});

test('www/sw.js precache list is up to date', () => {
  execFileSync('node', [path.join(ROOT, 'scripts/build-sw.mjs'), '--check'], { stdio: 'pipe' });
});

test('registry lists the six tools and never the excluded ones', () => {
  const src = fs.readFileSync(path.join(ROOT, 'www/registry.js'), 'utf8');
  const reg = new Function('window', src + '; return window.TMWB_REGISTRY;')({});
  assert.deepStrictEqual(reg.tools.map((t) => t.id), ['decoder', 'calculators', 'embedded', 'power', 'pcb', 'bench']);
  assert.ok(!/velxio|pinout/i.test(src));
  for (const t of reg.tools) assert.ok(t.tabs.length > 0, t.id + ' has tabs');
});
