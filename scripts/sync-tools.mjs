#!/usr/bin/env node
// Pulls the six Makers Workbench tool repos and vendors them into www/tools/<id>/.
// Usage: node scripts/sync-tools.mjs [--from <dir containing the six repo folders>]
// Without --from it shallow-clones https://github.com/MakersWorkbench/<repo>. Nothing is ever pushed to those repos.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(readFileSync(join(ROOT, 'scripts/tools.config.json'), 'utf8'));
const fromIdx = process.argv.indexOf('--from');
const fromDir = fromIdx > 0 ? resolve(process.argv[fromIdx + 1]) : null;
const work = fromDir ? null : mkdtempSync(join(tmpdir(), 'tmwb-sync-'));
const lock = {};

for (const t of cfg.tools) {
  let src;
  if (fromDir) src = join(fromDir, t.repo);
  else {
    src = join(work, t.repo);
    execFileSync('git', ['clone', '--depth', '1', `https://github.com/MakersWorkbench/${t.repo}`, src], { stdio: 'inherit' });
  }
  if (!existsSync(src)) throw new Error(`Missing source folder ${src}`);
  let sha = 'unknown';
  try { sha = execFileSync('git', ['-C', src, 'rev-parse', 'HEAD']).toString().trim(); } catch {}
  const dest = join(ROOT, 'www/tools', t.id);
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(join(dest, 'js'), { recursive: true });
  cpSync(join(src, t.css), join(dest, t.css));
  for (const f of [...t.scripts, t.app]) cpSync(join(src, f), join(dest, f));
  for (const f of ['LICENSE', 'NOTICE', 'SOURCES.md']) if (existsSync(join(src, f))) cpSync(join(src, f), join(dest, f));
  // Tests live outside www/ so they are not shipped. The require path is rewritten to point at the vendored logic.
  const tdest = join(ROOT, 'tests/tools', t.id);
  rmSync(tdest, { recursive: true, force: true });
  mkdirSync(tdest, { recursive: true });
  for (const f of t.tests) {
    const body = readFileSync(join(src, f), 'utf8').replace(/require\('\.\.\/js\//g, `require('../../../www/tools/${t.id}/js/`);
    writeFileSync(join(tdest, f.split('/').pop()), body);
  }
  lock[t.id] = { repo: t.repo, commit: sha };
}
for (const p of cfg.patches) {
  const f = join(ROOT, 'www/tools', p.tool, p.file);
  const body = readFileSync(f, 'utf8');
  if (!body.includes(p.from)) { console.warn(`PATCH SKIPPED (upstream may have fixed it): ${p.tool} ${p.from}`); continue; }
  writeFileSync(f, body.split(p.from).join(p.to));
  console.log(`patched ${p.tool}/${p.file}: ${p.why}`);
}
writeFileSync(join(ROOT, 'www/tools/sources.lock.json'), JSON.stringify(lock, null, 2) + '\n');
if (work) rmSync(work, { recursive: true, force: true });
console.log('Done. Next: npm run build:index && npm run build:sw');
