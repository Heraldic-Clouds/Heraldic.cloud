import { setTimeout as delay } from 'node:timers/promises';

export class NewsJobError extends Error {
  constructor(code) { super(code); this.name = 'NewsJobError'; this.code = code; }
}

async function boundedText(response, maxBytes) {
  if (Number(response.headers.get('content-length')) > maxBytes) throw new NewsJobError('response_too_large');
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    if (size > maxBytes) throw new NewsJobError('response_too_large');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function requestText(url, { fetchImpl = fetch, timeoutMs = 10000, maxBytes = 1024 * 1024, attempts = 3, allowedHosts, ...options } = {}) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      let destination = new URL(url);
      let response;
      const signal = AbortSignal.timeout(timeoutMs);
      for (let redirect = 0; redirect <= 3; redirect++) {
        if (allowedHosts && (destination.protocol !== 'https:' || destination.username || destination.password || destination.port || !allowedHosts.includes(destination.hostname))) {
          throw new NewsJobError('unsafe_feed_redirect');
        }
        response = await fetchImpl(destination.href, { ...options, redirect: 'manual', signal });
        if (response.status < 300 || response.status >= 400) break;
        await response.body?.cancel();
        const location = response.headers.get('location');
        if (!location || redirect === 3) throw new NewsJobError('too_many_redirects');
        destination = new URL(location, destination);
      }
      if (!response.ok) {
        await response.body?.cancel();
        const error = new NewsJobError(`http_${response.status}`);
        error.retryable = response.status === 429 || response.status >= 500;
        throw error;
      }
      return await boundedText(response, maxBytes);
    } catch (error) {
      if (attempt === attempts - 1 || (error instanceof NewsJobError && !error.retryable)) throw error;
      await delay(250 * 2 ** attempt);
    }
  }
}
