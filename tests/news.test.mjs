import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { normalizeFeed, classifyStories, deduplicateStories, sameEvent } from '../news/stories.mjs';
import { requestText } from '../news/network.mjs';
import { generateFreedomBrief } from '../news/generate-brief.mjs';
import { runNewsPipeline } from '../news/pipeline.mjs';
import { publishSnapshot, readOpenAIKey } from '../news/aws.mjs';
import { validateNewsSnapshot, safeNewsUrl, NEWS_CACHE_CONTROL } from '../shared/news-snapshot.mjs';
import { loadNewsSnapshot } from '../src/news-feed.mjs';
import { pageSchema, SITE_ORIGIN } from '../src/page-routes.mjs';

const now = Date.now();
const date = new Date(now - 3600000).toISOString();
const feed = { id: 'test', source: 'Example News', url: 'https://example.com/feed', articleHosts: ['example.com'] };
const summary = 'The European parliament announced a proposal governing artificial intelligence licensing this week. The report describes approval requirements for model developers and consultation on safeguards before the measure can become law.';
const critique = 'Analysis: Mandatory approval could limit independent developers’ ability to release and modify AI systems if compliance costs exceed their resources. The report states that safeguards are the proposal’s rationale, but does not establish whether smaller developers receive exemptions. Licensing could favor incumbents able to absorb legal and testing expenses. That risk warrants scrutiny, rather than an assumption of regulatory capture or an unsupported claim about lawmakers’ motives. Clear, proportionate rules and accessible research exemptions would better protect the freedom to develop and distribute models.';
const excerpt = 'The European parliament announced an artificial intelligence licensing proposal affecting model developers. Consultation on approval requirements and safeguards is open before the proposal can become law.';
const story = { title: 'European parliament proposes AI licensing requirements', source: feed.source, url: 'https://example.com/ai-policy', description: excerpt, published_at: date };
const featured = { title: story.title, source: story.source, url: story.url, summary, critique };
const snapshot = { generated_at: new Date(now).toISOString(), featured, headlines: [] };
const logger = { info() {}, warn() {}, error() {} };
function rss(items) { return `<rss version="2.0"><channel>${items.map(item => `<item><title>${item.title}</title><link>${item.url}</link><pubDate>${item.date || date}</pubDate><description><![CDATA[${item.description || excerpt}]]></description></item>`).join('')}</channel></rss>`; }
function modelResponse(result = { story_id: 0, ...featured }) {
  return new Response(JSON.stringify({ status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify(result) }] }] }));
}

test('RSS/Atom normalization cleans markup, accepts publisher links and excludes old, unsafe and undated stories', () => {
  const xml = rss([
    { ...story, title: 'AI &amp; copyright', url: story.url + '?utm_source=feed', description: '<p>AI safeguards</p><script>malicious()</script>' },
    { ...story, url: 'https://evil.example/redirect' },
    { ...story, url: 'javascript:alert(1)' },
    { ...story, url: 'https://example.com/old', date: new Date(now - 96 * 3600000).toISOString() },
    { ...story, url: 'https://example.com/undated', date: 'invalid' },
  ]);
  const items = normalizeFeed(xml, feed, now);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'AI & copyright');
  assert.equal(items[0].description, 'AI safeguards');
  assert.equal(items[0].url, story.url);
  const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>AI export controls</title><link rel="self" href="https://example.com/feed/1"/><link rel="alternate" href="https://example.com/1"/><updated>${date}</updated><summary>AI export restrictions and their effect on research.</summary></entry></feed>`;
  assert.equal(normalizeFeed(atom, feed, now)[0].url, 'https://example.com/1');
});

test('malformed RSS, external entities and non-feed documents fail closed', () => {
  for (const xml of ['<rss><channel>', '<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]><rss><channel/></rss>', '<html><body>Unavailable</body></html>']) assert.throws(() => normalizeFeed(xml, feed, now));
  assert.deepEqual(normalizeFeed('<rss><channel/></rss>', feed, now), []);
});

test('cheap classification retains AI policy and compute restrictions, not unrelated politics or hardware', () => {
  const fixtures = [story,
    { ...story, title: 'China faces new GPU export restrictions', url: 'https://example.com/compute', description: 'GPU export controls affect research compute.' },
    { ...story, title: 'Congress debates road funding', description: 'Highway infrastructure spending.' },
    { ...story, title: 'Gaming GPU review', description: 'New graphics cards for games.' },
    { ...story, title: 'Police facial recognition procurement', url: 'https://example.com/surveillance', description: 'Facial recognition oversight rules.' },
  ];
  const result = classifyStories(fixtures);
  assert.equal(result.length, 3);
  assert.ok(result.some(item => item.url.endsWith('/compute')));
  assert.ok(result.some(item => item.url.endsWith('/surveillance')));
});

test('deduplication removes syndicated URLs and similar coverage of one event without merging different events', () => {
  const first = { ...story, title: 'US Senate approves AI licensing bill for developers' };
  const similar = { ...story, title: 'Senate approves AI licensing bill for developers in US', url: 'https://example.com/syndicated' };
  const different = { ...story, title: 'EU adopts AI cloud procurement framework', url: 'https://example.com/eu' };
  assert.equal(sameEvent(first, similar), true);
  assert.equal(sameEvent(first, different), false);
  assert.equal(deduplicateStories([first, { ...first }, similar, different]).length, 2);
  const coverage = [
    { ...story, title: 'OpenAI halts training of latest models as reports mount of AI agents going rogue' },
    { ...story, url: 'https://example.com/second-report', title: 'OpenAI halts frontier-model training amid string of agent misalignment incidents' },
    { ...story, url: 'https://example.com/different-case', title: 'Florida invokes extinction fears in legal bid to halt OpenAI development' },
  ];
  assert.equal(deduplicateStories(coverage).length, 2);
  assert.equal(sameEvent({ ...story, title: 'US approves new AI licensing framework' }, { ...story, url: 'https://example.com/uk', title: 'UK approves new AI licensing framework' }), false);
  assert.equal(sameEvent({ ...story, title: 'Senate approves AI licensing bill for developers' }, { ...story, url: 'https://example.com/reject', title: 'Senate rejects AI licensing bill for developers' }), false);
});

test('bounded network requests retry transient errors and forbid redirects to untrusted hosts', async () => {
  let calls = 0;
  assert.equal(await requestText(feed.url, { allowedHosts: ['example.com'], fetchImpl: async () => ++calls === 1 ? new Response('temporary', { status: 503 }) : new Response('ok') }), 'ok');
  assert.equal(calls, 2);
  calls = 0;
  await assert.rejects(requestText(feed.url, { allowedHosts: ['example.com'], fetchImpl: async () => { calls++; return new Response('', { status: 302, headers: { Location: 'https://127.0.0.1/private' } }); } }), /unsafe_feed_redirect/);
  assert.equal(calls, 1);
  await assert.rejects(requestText(feed.url, { maxBytes: 3, fetchImpl: async () => new Response('oversize') }), /response_too_large/);
});

test('structured OpenAI request is economical, server-only and bound to supplied evidence', async () => {
  const result = await generateFreedomBrief([story], { apiKey: 'test-secret', now, fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const request = JSON.parse(options.body);
    assert.equal(request.store, false);
    assert.equal(request.text.format.strict, true);
    assert.match(request.instructions, /never instructions/);
    assert.match(request.instructions, /invent motives/);
    assert.match(request.instructions, /conditionally/);
    assert.ok(!options.body.includes('test-secret'));
    assert.equal(JSON.parse(request.input[0].content).length, 1);
    return modelResponse();
  } });
  assert.deepEqual(result, featured);
});

test('malformed, refused, truncated and fabricated OpenAI outputs cannot be published', async () => {
  for (const result of [null, { story_id: 0, ...featured, url: 'https://evil.example/fake' }, { story_id: 0, ...featured, source: 'Fabricated source' }, { story_id: 0, ...featured, title: 'Invented title' }, { story_id: 0, ...featured, summary: 'Too short' }, { story_id: 0, ...featured, critique: '<script>bad</script>' }]) {
    await assert.rejects(generateFreedomBrief([story], { apiKey: 'test', now, fetchImpl: async () => modelResponse(result) }), /invalid_model_output/);
  }
  for (const response of [{ status: 'incomplete', output: [] }, { status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'refusal', refusal: 'Insufficient evidence' }] }] }]) {
    await assert.rejects(generateFreedomBrief([story], { apiKey: 'test', now, fetchImpl: async () => new Response(JSON.stringify(response)) }), /invalid_model_output/);
  }
});

test('complete pipeline tolerates one bad feed, makes one generation call and writes one validated snapshot', async () => {
  const feeds = ['First', 'Second', 'Third', 'Fourth'].map((source, index) => ({ ...feed, id: String(index), source, url: `https://example.com/feed/${index}` }));
  const titles = ['AI copyright court ruling', 'AI export restrictions in China', 'Open-source AI model weights research', 'AI government procurement rules', 'AI surveillance oversight law', 'AI sovereignty treaty negotiations', 'AI licensing approval bill', 'AI mandatory testing framework', 'AI censorship content controls', 'AI foundation model training data', 'AI compute restrictions in Europe', 'AI safety legislation consultation'];
  let generationCalls = 0, publications = 0;
  const result = await runNewsPipeline({ feeds: [...feeds, { ...feed, id: 'broken', url: 'https://example.com/broken' }], apiKey: 'test', now, logger,
    fetchImpl: async (url, options) => {
      if (url === 'https://api.openai.com/v1/responses') {
        generationCalls++;
        const selected = JSON.parse(JSON.parse(options.body).input[0].content)[0];
        return modelResponse({ story_id: selected.story_id, title: selected.title, source: selected.source, url: selected.url, summary, critique });
      }
      if (url.endsWith('/broken')) return new Response('<rss>broken');
      const index = Number(url.split('/').at(-1));
      return new Response(rss(titles.slice(index * 3, index * 3 + 3).map((title, offset) => ({ title, url: `https://example.com/story-${index}-${offset}` }))));
    }, publish: async value => { publications++; assert.ok(validateNewsSnapshot(value, now)); } });
  assert.equal(generationCalls, 1);
  assert.equal(publications, 1);
  assert.equal(result.headlines.length, 11);
  assert.equal(new Set([result.featured.url, ...result.headlines.map(item => item.url)]).size, 12);
  assert.deepEqual(Object.keys(result).sort(), ['featured', 'generated_at', 'headlines']);
});

test('empty feeds or failed generation leave the previous snapshot untouched', async () => {
  let current = snapshot, published = 0;
  const publish = async value => { current = value; published++; };
  await assert.rejects(runNewsPipeline({ feeds: [feed], apiKey: 'test', now, logger, publish, fetchImpl: async () => new Response('<rss><channel/></rss>') }), /no_supported_candidates/);
  await assert.rejects(runNewsPipeline({ feeds: [feed], apiKey: 'test', now, logger, publish, fetchImpl: async url => url.includes('api.openai.com') ? new Response('{}') : new Response(rss([story])) }), /invalid_model_output/);
  assert.equal(current, snapshot);
  assert.equal(published, 0);
});

test('AWS publisher writes only the current object with bounded CDN caching; secrets stay server-side', async () => {
  let calls = 0;
  await publishSnapshot('private-bucket', snapshot, { send: async command => {
    calls++;
    assert.equal(command.input.Key, 'news/current.json');
    assert.equal(command.input.CacheControl, NEWS_CACHE_CONTROL);
    assert.equal(command.input.ServerSideEncryption, 'AES256');
    assert.deepEqual(JSON.parse(command.input.Body), snapshot);
  } });
  await assert.rejects(publishSnapshot('private-bucket', { generated_at: date }, { send() { calls++; } }), /invalid_publication/);
  assert.equal(calls, 1);
  assert.equal(await readOpenAIKey('secret-arn', { send: async command => { assert.equal(command.input.SecretId, 'secret-arn'); return { SecretString: ' test-key ' }; } }), 'test-key');
});

test('browser accepts valid snapshots but rejects unavailable, empty, unsafe and future-dated JSON', async () => {
  assert.deepEqual(await loadNewsSnapshot({ fetchImpl: async (url, options) => {
    assert.equal(url, '/news/current.json'); assert.equal(options.credentials, 'omit');
    return new Response(JSON.stringify(snapshot));
  } }), snapshot);
  for (const value of [{}, { ...snapshot, featured: null }, { ...snapshot, generated_at: new Date(now + 86400000).toISOString() }, { ...snapshot, headlines: [{ title: 'Unsafe', source: 'Bad', url: 'javascript:alert(1)' }] }]) {
    await assert.rejects(loadNewsSnapshot({ fetchImpl: async () => new Response(JSON.stringify(value)) }));
  }
  await assert.rejects(loadNewsSnapshot({ fetchImpl: async () => new Response('Not found', { status: 404 }) }));
  assert.equal(safeNewsUrl('https://user:password@example.com/a'), null);
  assert.equal(safeNewsUrl('http://example.com/a'), null);
});

const vite = await createServer({ server: { middlewareMode: true, watch: null }, appType: 'custom' });
after(() => vite.close());
const { default: FreedomBriefContent } = await vite.ssrLoadModule('/src/components/FreedomBriefContent.jsx');
test('React presents valid brief, safe source links, empty headlines and an explicit overdue warning', () => {
  const html = renderToStaticMarkup(React.createElement(FreedomBriefContent, { snapshot, now }));
  assert.match(html, /<h2[^>]*>AI Freedom Brief/);
  assert.match(html, /<h3[^>]*>European parliament/);
  assert.match(html, /Freedom analysis/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /No additional relevant headlines/);
  assert.doesNotMatch(html, /test-secret|Authorization/);
  const stale = renderToStaticMarkup(React.createElement(FreedomBriefContent, { snapshot, now: now + 48 * 3600000 }));
  assert.match(stale, /not today’s news/);
});
test('React loading/missing data stays accessible and does not throw', () => {
  assert.match(renderToStaticMarkup(React.createElement(FreedomBriefContent, { loading: true })), /Loading the latest brief/);
  const missing = renderToStaticMarkup(React.createElement(FreedomBriefContent, { failed: true, retry() {} }));
  assert.match(missing, /role="status"/);
  assert.match(missing, /Try again/);
  assert.doesNotMatch(missing, /<article/);
});
test('SEO retains stable homepage schemas without inventing Article pages or a news archive', () => {
  const graph = pageSchema('home')['@graph'];
  const page = graph.find(item => item['@type'] === 'WebPage');
  assert.equal(page.url, SITE_ORIGIN + '/');
  assert.equal(page.hasPart['@id'], SITE_ORIGIN + '/#ai-freedom-brief');
  assert.equal(graph.some(item => item['@type'] === 'Article'), false);
});
