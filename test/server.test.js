const test = require('node:test');
const assert = require('node:assert/strict');
const { server, MANIFEST, normalizeStream } = require('../src/server');
let base;

test('Stremio endpoint contract', async (t) => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  t.after(() => new Promise(resolve => server.close(resolve)));

  const manifestRes = await fetch(`${base}/manifest.json`);
  assert.equal(manifestRes.status, 200);
  const manifest = await manifestRes.json();
  assert.equal(manifest.id, 'com.multimedia.sourceaddon');
  assert.ok(manifest.resources.includes('stream'));
  assert.ok(manifest.resources.includes('meta'));
  assert.equal(manifest.version, MANIFEST.version);

  const health = await (await fetch(`${base}/health`)).json();
  assert.equal(health.ok, true);

  const sources = await (await fetch(`${base}/sources.json`)).json();
  assert.equal(sources.sources.length, 9);
  assert.ok(sources.sources.every(s => s.name && /^https:\/\//.test(s.homepage)));

  const streams = await (await fetch(`${base}/stream/movie/tt0133093.json`)).json();
  assert.deepEqual(streams.streams, [], 'schema-only sample must not be advertised as playable');

  const meta = await (await fetch(`${base}/meta/movie/tt0133093.json`)).json();
  assert.equal(meta.meta.id, 'tt0133093');
  assert.equal(meta.meta.type, 'movie');

  const notFound = await fetch(`${base}/nope`);
  assert.equal(notFound.status, 404);
  const method = await fetch(`${base}/manifest.json`, { method: 'POST' });
  assert.equal(method.status, 405);
});

test('stream normalization keeps provider attribution', () => {
  const stream = normalizeStream({ provider: 'Demo Site', url: 'https://example.org/video.m3u8', title: '1080p', description: 'Official stream' });
  assert.equal(stream.name, 'Demo Site');
  assert.match(stream.title, /^Demo Site\n1080p$/);
  assert.match(stream.description, /^Demo Site · Official stream$/);
  assert.equal(stream.url, 'https://example.org/video.m3u8');
});
