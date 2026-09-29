import { readFile } from 'node:fs/promises';
import { requestText, NewsJobError } from './network.mjs';
import { normalizeFeed } from './stories.mjs';

export async function loadFeeds() {
  const feeds = JSON.parse(await readFile(new URL('./rss-feeds.json', import.meta.url), 'utf8'));
  if (!Array.isArray(feeds) || !feeds.length || feeds.length > 30) throw new NewsJobError('invalid_feed_configuration');
  for (const feed of feeds) {
    const url = new URL(feed.url);
    if (!feed.id || !feed.source || url.protocol !== 'https:' || url.username || url.password || url.port || !Array.isArray(feed.articleHosts) || !feed.articleHosts.length) throw new NewsJobError('invalid_feed_configuration');
  }
  return feeds;
}

export async function fetchFeeds(feeds, { fetchImpl = fetch, now = Date.now(), lookbackHours = 72, logger = console } = {}) {
  const results = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, feeds.length) }, async () => {
    while (next < feeds.length) {
      const feed = feeds[next++];
      try {
        const xml = await requestText(feed.url, { fetchImpl, allowedHosts: [new URL(feed.url).hostname, ...(feed.redirectHosts || [])], headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml', 'User-Agent': 'HeraldicFreedomBrief/1.0 (+https://www.heraldic.cloud/)' } });
        const stories = normalizeFeed(xml, feed, now, lookbackHours);
        results.push(...stories);
        logger.info(JSON.stringify({ event: 'news_feed_ok', feed: feed.id, stories: stories.length }));
      } catch (error) {
        logger.warn(JSON.stringify({ event: 'news_feed_failed', feed: feed.id, code: error instanceof NewsJobError ? error.code : 'malformed_or_unavailable_feed' }));
      }
    }
  }));
  return results;
}
