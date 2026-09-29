export const NEWS_PATH = '/news/current.json';
export const NEWS_CACHE_CONTROL = 'public, max-age=60, s-maxage=300, must-revalidate';
export const NEWS_STALE_AFTER_MS = 36 * 60 * 60 * 1000;

export function safeNewsUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !url.hostname.includes('.') ||
        /^(?:localhost|.*\.localhost|.*\.local|\d+(?:\.\d+){3}|\[.*\])$/i.test(url.hostname)) return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_.+|fbclid|gclid|xtor|ref|ref_src)$/i.test(key)) url.searchParams.delete(key);
    }
    return url.href;
  } catch { return null; }
}

export function wordCount(value) { return value.trim().split(/\s+/u).filter(Boolean).length; }

function plainText(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength &&
    !/<[^>]*>|[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(value);
}

function headline(value) {
  if (!value || !plainText(value.title, 300) || !plainText(value.source, 100)) return null;
  const url = safeNewsUrl(value.url);
  return url ? { title: value.title.trim(), source: value.source.trim(), url } : null;
}

// Shared by the publisher and browser: neither trusts raw model or remote JSON output.
export function validateNewsSnapshot(value, now = Date.now()) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      typeof value.generated_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*Z$/.test(value.generated_at)) return null;
  const generated = Date.parse(value.generated_at);
  if (!Number.isFinite(generated) || generated > now + 5 * 60 * 1000) return null;
  const featured = headline(value.featured);
  if (!featured || !plainText(value.featured.summary, 1000) || !plainText(value.featured.critique, 2500)) return null;
  const summary = value.featured.summary.trim();
  const critique = value.featured.critique.trim();
  if (wordCount(summary) < 25 || wordCount(summary) > 45 || wordCount(critique) < 60 || wordCount(critique) > 120 ||
      critique.split(/\n\s*\n/u).length > 2) return null;
  if (!Array.isArray(value.headlines) || value.headlines.length > 20) return null;
  const headlines = value.headlines.map(headline);
  if (headlines.some(item => !item)) return null;
  const urls = [featured.url, ...headlines.map(item => item.url)];
  if (new Set(urls).size !== urls.length) return null;
  return { generated_at: new Date(generated).toISOString(), featured: { ...featured, summary, critique }, headlines };
}
