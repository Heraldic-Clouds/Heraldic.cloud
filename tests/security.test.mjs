import test from 'node:test';
import assert from 'node:assert/strict';
import { safeLayout, safeLayoutPatch, restoreLayout, mergeLayout, inferLayoutPatch, defaultLayout, safePalette, defaultPalette, safeCopy, forbiddenRequest } from '../lambda/design.mjs';
import { PROMPT_MAX_LENGTH, containsLink, validatePrompt } from '../lambda/prompt.mjs';
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
test('successive layout patches survive browser serialization without resetting earlier choices', () => {
  const first = mergeLayout(defaultLayout, { density: 'airy', cards: 'two-column', hero: 'logo-right' });
  const second = mergeLayout(first, { typography: 'serif', density: null, cards: null });
  const restored = restoreLayout(JSON.parse(JSON.stringify(second)));
  assert.equal(restored.density, 'airy');
  assert.equal(restored.cards, 'two-column');
  assert.equal(restored.hero, 'logo-right');
  assert.equal(restored.typography, 'serif');
  assert.deepEqual(mergeLayout(second, { page: '/evil', density: 'compact' }), second);
  assert.equal(safeLayoutPatch(JSON.parse('{"__proto__":{"polluted":true},"cards":"list"}')), null);
  assert.deepEqual(restoreLayout({ density: 'compact', cards: 'list' }), { ...defaultLayout, density: 'compact', cards: 'list' });
});
test('new-page refusals handle whitespace and hidden characters without blocking normal spacing requests', () => {
  for (const prompt of ['add\na new\npage', 'add a ne\u200bw page', 'create a landing page']) assert.equal(forbiddenRequest(prompt), true);
  assert.equal(forbiddenRequest('Add generous spacing to the page'), false);
});
test('AI prompts are short and cannot contain links', async () => {
  assert.equal(PROMPT_MAX_LENGTH, 400);
  assert.equal(validatePrompt('Adjust the spacing and use a larger logo.'), '');
  assert.equal(containsLink('Visit https://example.com for details.'), true);
  assert.equal(containsLink('Try www.example.com or example.com.'), true);
  assert.match(validatePrompt('a'.repeat(PROMPT_MAX_LENGTH + 1)), /400 characters/);
  assert.match(validatePrompt('Use this link: https://example.com'), /Links are not allowed/);
  const result = await handler({ rawPath: '/api/chat', httpMethod: 'POST', clientIp: 'prompt-validation-test', body: JSON.stringify({ message: 'Visit https://example.com' }) });
  assert.equal(result.statusCode, 400);
  assert.match(JSON.parse(result.body).error, /Links are not allowed/);
});
test('visitor wording maps to safe layout patches before an AI response arrives', () => {
  assert.deepEqual(inferLayoutPatch('make it look like Apple standards with airy spacing and a logo on the right'), { density: 'airy', hero: 'logo-right' });
  assert.deepEqual(inferLayoutPatch('use serif type and two columns'), { typography: 'serif', cards: 'two-column' });
  assert.equal(inferLayoutPatch('add a new page with an iframe'), null);
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
      assert.match(result.body, /property="og:title"/);
      assert.match(result.body, /name="twitter:title"/);
      assert.match(result.body, /application\/ld\+json/);
      if (path === '/media/') {
        assert.match(result.body, /<title>Heraldic Media \| MEA Posters & Cloud Desktop Archive<\/title>/);
        assert.match(result.body, /View Heraldic’s NVIDIA GTC conference posters and archival cloud desktop/);
        assert.match(result.body, /media\/gtc2018-mea-poster-preview\.jpg/);
      }
      assert.match(result.headers['Content-Security-Policy'], /sha256-/);
    }
  }
});
test('mission, media links and removed monitor label are prerendered', async () => {
  const home = (await handler({ rawPath: '/' })).body;
  assert.match(home, /Nothing is impossible/);
  assert.match(home, /Our mission is to democratize technology and ensure prosperety for all humanity/);
  assert.match(home, /free, democratized, humane AI/);
  assert.match(home, /We are committed to free, democratized, humane AI aligned with the values of humanity/);
  assert.match(home, /pioneering AI governance solutions|pioneer company in AI governance solutions/);
  assert.match(home, /HERALDIC2026\.png/);
  assert.match(home, /class="mission-logo"/);
  assert.match(home, /class="keyboard-body chat-open"/);
  assert.match(home, /id="artem-prompt"/);
  assert.match(home, /This site is not tracking you/);
  assert.match(home, /keyboard-close/);
  assert.match(home, /class="chat-panel is-open"/);
  assert.doesNotMatch(home, /Heraldic’s stated values/);
  assert.doesNotMatch(home, /ARTEM AI · HERALDIC CEO PERSONA/);
  assert.ok(home.indexOf('id="about"') < home.indexOf('id="privacy"'));
  assert.doesNotMatch(home, /We build open, distributed, privacy-respecting technology for humanity/);
  assert.doesNotMatch(home, />How it works</);
  assert.doesNotMatch(home, />Systems</);
  assert.doesNotMatch(home, /id="how-it-works"/);
  assert.doesNotMatch(home, /id="systems"/);
  assert.doesNotMatch(home, /class="screen-footer"><span>HERALDIC/);
  const mea = (await handler({ rawPath: '/mea/' })).body;
  assert.match(mea, /id="how-it-works"/);
  assert.match(mea, /id="systems"/);
  const media = (await handler({ rawPath: '/media/' })).body;
  assert.match(media, /gtc2017-preview\.png/);
  assert.match(media, /gtc2018-mea-poster-preview\.jpg/);
  assert.match(media, /google-earth-zion\.png/);
  assert.match(media, /Heraldic’s conference posters/);
  assert.doesNotMatch(media, /\.pdf|Download PDF|Open PDF/i);
  assert.doesNotMatch(media, /<iframe|<object/);
});
test('MEA presents current offerings without removed historical graphics', async () => {
  const mea = (await handler({ rawPath: '/mea/' })).body;
  assert.doesNotMatch(mea, /a-plus-certified|cloudplus-certified|mea-art\.jpg/);
  assert.doesNotMatch(mea, /archived rendering|feature statements below preserve|former product lineup|original|legacy/i);
  assert.match(mea, /Mise En Abyme is a desktop experience/);
  assert.match(mea, /Three paths into the cloud/);
});
test('removed poster PDFs are not served by the site', async () => {
  for (const path of ['/media/GTC2017MEAposter.pdf', '/media/Mise_En_Abyme_Cloud_Primary_personal_Computers.pdf', '/media/GTC2018MEAposter.pdf']) {
    assert.equal((await handler({ rawPath: path })).statusCode, 404);
  }
});
test('cross-site API calls and traversal fail closed', async () => {
  assert.equal((await handler({ rawPath: '/api/chat', httpMethod: 'POST', headers: { 'sec-fetch-site': 'cross-site' } })).statusCode, 403);
  assert.equal((await handler({ rawPath: '/api/chat', httpMethod: 'POST', headers: { origin: 'https://evil.example' } })).statusCode, 403);
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
    modelResult.layout = { typography: 'mono', density: null, cards: null };
    assert.deepEqual((await call()).layout, { typography: 'mono' });
    modelResult.layout = { ...defaultLayout, script: 'alert(1)' };
    assert.equal((await call()).layout, null);
    modelResult = { action: 'refuse', reply: 'No', layout: defaultLayout, theme: defaultPalette, siteCopy: { heroTitle: 'unwanted' } };
    const refused = await call();
    assert.equal(refused.theme, null);
    assert.deepEqual(refused.siteCopy, {});
    modelResult = null;
    assert.match((await call()).error, /invalid response/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey;
  }
});
