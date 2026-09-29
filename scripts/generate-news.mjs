import { mkdir, writeFile, rename } from 'node:fs/promises';
import { loadFeeds } from '../news/fetch-feeds.mjs';
import { runNewsPipeline } from '../news/pipeline.mjs';
import { NewsJobError } from '../news/network.mjs';

// Local preview only; never uploads to AWS or stores a key in the snapshot.
try {
  if (!process.env.OPENAI_API_KEY) throw new NewsJobError('missing_local_api_key');
  const target = new URL('../public/news/current.json', import.meta.url);
  await runNewsPipeline({ feeds: await loadFeeds(), apiKey: process.env.OPENAI_API_KEY,
    model: process.env.NEWS_OPENAI_MODEL || 'gpt-6-luna',
    publish: async snapshot => {
      await mkdir(new URL('.', target), { recursive: true });
      const temporary = new URL(`${target.href}.tmp`);
      await writeFile(temporary, JSON.stringify(snapshot));
      await rename(temporary, target);
    } });
} catch (error) {
  console.error(JSON.stringify({ event: 'news_failed', code: error instanceof NewsJobError ? error.code : 'news_job_failed', previous_snapshot_preserved: true }));
  process.exitCode = 1;
}
