import test from 'node:test';
import assert from 'node:assert/strict';
import { safeLayout, defaultLayout, safePalette, defaultPalette, safeCopy, forbiddenRequest } from '../lambda/design.mjs';
import { handler } from '../lambda/index.mjs';
test('layout accepts only complete finite presentation options', () => {
  assert.deepEqual(safeLayout(defaultLayout), defaultLayout);
  for (const value of [{ ...defaultLayout, page: '/evil' }, { ...defaultLayout, hero: '<script>' }, {}, null, []]) assert.equal(safeLayout(value), null);
});
test('palette rejects unreadable colors and executable values', () => {
  assert.deepEqual(safePalette(defaultPalette), defaultPalette);
  assert.equal(safePalette({ ...defaultPalette, text: '#ffffff' }), null);
  assert.equal(safePalette({ ...defaultPalette, page: 'url(evil)' }), null);
  assert.deepEqual(safeCopy({ title: '<script>alert(1)</script>', unknown: 'bad' }, { title: 'good' }), {});
});
test('malicious and new-page requests cannot reach the model', async () => {
  for (const message of ['add a new page', 'create pages', 'disable security', 'hide privacy', 'add cookies', 'add javascript']) {
    assert.equal(forbiddenRequest(message), true);
    const result = await handler({ rawPath: '/api/chat', httpMethod: 'POST', clientIp: message, body: JSON.stringify({ message }) });
    assert.equal(result.statusCode, 200);
    assert.equal(JSON.parse(result.body).layout, null);
    assert.deepEqual(JSON.parse(result.body).siteCopy, {});
    assert.ok(!Object.keys(result.headers).some(key => key.toLowerCase() === 'set-cookie'));
  }
});
test('SEO pages are prerendered, canonical and cookie-free; unknown pages are 404', async () => {
  for (const [path, expected] of [['/', 200], ['/mea/', 200], ['/media/', 200], ['/media', 308], ['/not-a-page', 404], ['/mea', 308], ['/robots.txt', 200], ['/sitemap.xml', 200], ['/mea/mea-art.jpg', 200]]) {
    const result = await handler({ rawPath: path, httpMethod: 'GET' });
    assert.equal(result.statusCode, expected, path);
    assert.ok(!Object.keys(result.headers).some(key => key.toLowerCase() === 'set-cookie'));
    if (['/', '/mea/', '/media/'].includes(path)) {
      assert.match(result.body, /<h1/);
      assert.match(result.body, /rel="canonical"/);
      assert.match(result.body, /application\/ld\+json/);
      assert.match(result.headers['Content-Security-Policy'], /sha256-/);
    }
  }
});
test('mission, media links and removed monitor label are prerendered', async () => {
  const home = (await handler({ rawPath: '/' })).body;
  assert.match(home, /Nothing Is Impossible/);
  assert.match(home, /PeopleWelcome/);
  assert.match(home, /artificial general intelligence/);
  assert.match(home, /class="mission-logo"/);
  assert.doesNotMatch(home, /class="screen-footer"><span>HERALDIC/);
  const media = (await handler({ rawPath: '/media/' })).body;
  assert.match(media, /GTC2017MEAposter\.pdf/);
  assert.match(media, /Mise_En_Abyme_Cloud_Primary_personal_Computers\.pdf/);
  assert.doesNotMatch(media, /<iframe|<object/);
});
test('Lambda redirects large PDFs to configured HTTPS storage without cookies', async () => {
  const old = process.env.MEDIA_BASE_URL;
  try {
    delete process.env.MEDIA_BASE_URL;
    assert.equal((await handler({ rawPath: '/media/GTC2017MEAposter.pdf' })).statusCode, 503);
    process.env.MEDIA_BASE_URL = 'https://media.example.test/posters/';
    const result = await handler({ rawPath: '/media/GTC2017MEAposter.pdf' });
    assert.equal(result.statusCode, 302);
    assert.equal(result.headers.Location, 'https://media.example.test/posters/GTC2017MEAposter.pdf');
    assert.ok(!Object.keys(result.headers).some(key => key.toLowerCase() === 'set-cookie'));
    process.env.MEDIA_BASE_URL = 'http://insecure.example.test/';
    assert.equal((await handler({ rawPath: '/media/GTC2017MEAposter.pdf' })).statusCode, 503);
  } finally { if (old === undefined) delete process.env.MEDIA_BASE_URL; else process.env.MEDIA_BASE_URL = old; }
});
test('cross-site API calls and traversal fail closed', async () => {
  assert.equal((await handler({ rawPath: '/api/chat', httpMethod: 'POST', headers: { 'sec-fetch-site': 'cross-site' } })).statusCode, 403);
  assert.equal((await handler({ rawPath: '/%2e%2e/.env.local' })).statusCode, 400);
});
test('model output is validated and saved visitor designs are never forwarded', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-only-not-a-real-key';
  let modelResult = { action: 'customize', reply: 'Updated.', layout: { ...defaultLayout, cards: 'list' }, theme: null, siteCopy: {} };
  globalThis.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    assert.equal(request.store, false);
    assert.ok(!options.body.includes('private-saved-design'));
    return { ok: true, json: async () => ({ output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify(modelResult) }] }] }) };
  };
  const call = async () => JSON.parse((await handler({ rawPath: '/api/chat', httpMethod: 'POST', clientIp: 'model-test', body: JSON.stringify({ message: 'Use a list layout', siteCopy: { heroTitle: 'private-saved-design' } }) })).body);
  try {
    assert.equal((await call()).layout.cards, 'list');
    modelResult.layout = { ...defaultLayout, script: 'alert(1)' };
    assert.equal((await call()).layout, null);
    modelResult = { action: 'refuse', reply: 'No', layout: defaultLayout, theme: defaultPalette, siteCopy: { heroTitle: 'unwanted' } };
    const refused = await call();
    assert.equal(refused.theme, null);
    assert.deepEqual(refused.siteCopy, {});
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey;
  }
});
