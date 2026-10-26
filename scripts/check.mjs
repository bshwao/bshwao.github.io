import { readdir, readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const assets = resolve(root, 'assets');
const files = (await readdir(assets)).filter(file => file.endsWith('.js')).map(file => resolve(assets, file));
files.push(resolve(root, 'scripts/serve.mjs'), resolve(root, 'scripts/reading.mjs'), resolve(root, 'scripts/theme.mjs'), resolve(root, 'scripts/social-card.js'), resolve(root, 'scripts/browser-qa.js'), resolve(root, 'scripts/frame-qa.js'), resolve(root, 'scripts/color-review.js'), resolve(root, 'scripts/vision-simulation.js'), resolve(root, 'scripts/accessibility-qa.js'), resolve(root, 'scripts/verify-live.mjs'));
files.push(resolve(root,'scripts/skyline-qa.js'));
files.push(resolve(root,'scripts/shadow-study.js'));
files.push(resolve(root,'scripts/time-qa.js'));
files.push(resolve(root,'scripts/outskirts-qa.js'));
files.push(resolve(root,'scripts/intro-qa.js'),resolve(root,'scripts/view-controls-qa.js'));
files.push(resolve(root,'scripts/penthouse-preview.js'));
files.push(resolve(root,'scripts/outdoor-rain-qa.js'));
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) { process.stderr.write(result.stderr); process.exit(1); }
  const source = await readFile(file, 'utf8');
  for (const match of source.matchAll(/(?:from\s*|import\s*\(?\s*)['"](\.\.?\/[^'"]+)['"]/g)) {
    await stat(resolve(dirname(file), match[1]));
  }
}
for (const name of ['index.html', 'reading.html']) {
  const html = await readFile(resolve(root, name), 'utf8');
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  for (const [, href] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (href.startsWith('./')) await stat(resolve(root, href.split(/[?#]/)[0]));
    if (href.startsWith('#') && !ids.has(href.slice(1))) throw new Error(`${name}: missing anchor ${href}`);
  }
}
for (const file of ['three.module.min.js', 'three.core.min.js', 'OrbitControls.js', 'LICENSE']) await stat(resolve(assets, 'vendor', file));
console.log(`Syntax and local asset references passed (${files.length} modules).`);
