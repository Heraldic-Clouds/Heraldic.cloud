import { readOpenAIKey, publishSnapshot } from './aws.mjs';
import { loadFeeds } from './fetch-feeds.mjs';
import { runNewsPipeline } from './pipeline.mjs';
import { NewsJobError } from './network.mjs';

export async function handler() {
  let publicationAttempted = false;
  try {
    if (!process.env.NEWS_BUCKET) throw new NewsJobError('missing_bucket_configuration');
    const lookbackHours = Number(process.env.NEWS_LOOKBACK_HOURS || 72);
    if (!Number.isInteger(lookbackHours) || lookbackHours < 1 || lookbackHours > 168) throw new NewsJobError('invalid_lookback');
    const snapshot = await runNewsPipeline({ feeds: await loadFeeds(),
      apiKey: await readOpenAIKey(process.env.OPENAI_SECRET_ARN),
      model: process.env.NEWS_OPENAI_MODEL || 'gpt-6-luna', lookbackHours,
      publish: value => { publicationAttempted = true; return publishSnapshot(process.env.NEWS_BUCKET, value); } });
    return { generated_at: snapshot.generated_at, headlines: snapshot.headlines.length };
  } catch (error) {
    const code = error instanceof NewsJobError ? error.code : 'news_job_failed';
    console.error(JSON.stringify({ event: 'news_failed', code, publication_attempted: publicationAttempted,
      snapshot_state: publicationAttempted ? 'previous_or_new_valid_snapshot' : 'previous_snapshot_preserved' }));
    throw new NewsJobError(code);
  }
}
