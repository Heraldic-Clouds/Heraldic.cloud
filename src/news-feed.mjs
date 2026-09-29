import { NEWS_PATH, validateNewsSnapshot } from '../shared/news-snapshot.mjs';

export async function loadNewsSnapshot({ fetchImpl = fetch, signal } = {}) {
  const response = await fetchImpl(NEWS_PATH, { credentials: 'omit', cache: 'no-cache', signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('News snapshot unavailable');
  const body = await response.text();
  if (body.length > 64 * 1024) throw new Error('News snapshot too large');
  const snapshot = validateNewsSnapshot(JSON.parse(body));
  if (!snapshot) throw new Error('Invalid news snapshot');
  return snapshot;
}
