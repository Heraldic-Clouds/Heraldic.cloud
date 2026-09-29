import { fetchFeeds } from './fetch-feeds.mjs';
import { classifyStories, deduplicateStories, diverseStories } from './stories.mjs';
import { generateFreedomBrief } from './generate-brief.mjs';
import { NewsJobError } from './network.mjs';
import { validateNewsSnapshot } from '../shared/news-snapshot.mjs';

export async function runNewsPipeline({ feeds, apiKey, model, fetchImpl = fetch, now = Date.now(), lookbackHours = 72, publish, logger = console }) {
  const fetched = await fetchFeeds(feeds, { fetchImpl, now, lookbackHours, logger });
  const relevant = deduplicateStories(classifyStories(fetched));
  const candidates = diverseStories(relevant.filter(story => story.description.length >= 80));
  if (!candidates.length) throw new NewsJobError('no_supported_candidates');
  const featured = await generateFreedomBrief(candidates, { apiKey, model, fetchImpl, now });
  const headlines = diverseStories(relevant.filter(story => story.url !== featured.url), 20).map(({ title, source, url }) => ({ title, source, url }));
  const snapshot = validateNewsSnapshot({ generated_at: new Date(now).toISOString(), featured, headlines }, now);
  if (!snapshot) throw new NewsJobError('invalid_snapshot');
  // A single atomic S3 replacement is the final step, never an empty/error placeholder.
  await publish(snapshot);
  logger.info(JSON.stringify({ event: 'news_published', fetched: fetched.length, relevant: relevant.length, candidates: candidates.length, headlines: headlines.length }));
  return snapshot;
}
