import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { floorContent } from '../assets/floor-content.js';

const root = resolve(import.meta.dirname, '..');
const site = 'https://bshwao.github.io/';
test('both entry pages share a real, correctly sized social card and canonical URLs', async () => {
  const image = await readFile(resolve(root, 'assets/social-preview.png'));
  assert.equal(image.subarray(1, 4).toString(), 'PNG');
  assert.equal(image.readUInt32BE(16), 1280); assert.equal(image.readUInt32BE(20), 720);
  assert.ok(image.length < 500_000, 'Social artwork stays inexpensive to fetch');
  for (const file of ['index.html', 'reading.html']) {
    const source = await readFile(resolve(root, file), 'utf8');
    const canonical = file === 'index.html' ? site : `${site}reading.html`;
    assert.ok(source.includes(`<link rel="canonical" href="${canonical}">`));
    assert.ok(source.includes(`<meta property="og:url" content="${canonical}">`));
    assert.ok(source.includes(`<meta property="og:image" content="${site}assets/social-preview.png">`));
    assert.ok(source.includes('name="twitter:card" content="summary_large_image"'));
    assert.ok(source.includes('property="og:image:alt" content="Eric Hsu'));
    assert.ok(!source.includes('noindex'));
  }
  const reading = await readFile(resolve(root, 'reading.html'), 'utf8');
  const schema = JSON.parse(reading.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(schema.name, 'Eric Hsu'); assert.equal(schema.url, site);
});
test('crawl configuration indexes the canonical pages and all room assets resolve locally', async () => {
  const sitemap = await readFile(resolve(root, 'sitemap.xml'), 'utf8');
  assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]), [site, `${site}reading.html`]);
  const robots = await readFile(resolve(root, 'robots.txt'), 'utf8');
  assert.ok(robots.includes('Allow: /') && robots.includes(`Sitemap: ${site}sitemap.xml`));
  for (const floor of Object.values(floorContent)) for (const room of floor.rooms) {
    for (const image of room.images || []) {
      assert.ok(image.alt?.trim().length && image.width > 0 && image.height > 0);
      assert.ok((await stat(resolve(root, image.src))).isFile());
    }
    for (const link of room.links || []) if (link.href.startsWith('./')) assert.ok((await stat(resolve(root, link.href))).isFile());
  }
});
