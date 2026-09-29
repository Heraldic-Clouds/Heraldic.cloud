import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { safeNewsUrl } from '../shared/news-snapshot.mjs';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', parseTagValue: false, removeNSPrefix: true });
const asArray = value => value == null ? [] : Array.isArray(value) ? value : [value];
const textValue = value => typeof value === 'string' ? value : typeof value?.['#text'] === 'string' ? value['#text'] : '';

export function cleanFeedText(value, maxLength = 600) {
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—' };
  return textValue(value).slice(0, 20000).replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code) => {
    const point = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code);
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : '';
  }).replace(/&([a-z]+);/gi, (match, entity) => entities[entity.toLowerCase()] ?? match)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/gu, ' ').replace(/\s+/gu, ' ').trim().slice(0, maxLength);
}

export function normalizeFeed(xml, feed, now = Date.now(), lookbackHours = 72) {
  if (typeof xml !== 'string' || /<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true) throw new Error('malformed_rss');
  const document = parser.parse(xml);
  const items = document.rss?.channel?.item ?? document.feed?.entry ?? document.RDF?.item;
  if (!document.rss && !document.feed && !document.RDF) throw new Error('unsupported_feed');
  return asArray(items).slice(0, 200).flatMap(item => {
    const title = cleanFeedText(item.title, 300);
    const links = asArray(item.link);
    const rawLink = links.find(link => link?.['@_href'] && (!link['@_rel'] || link['@_rel'] === 'alternate'))?.['@_href'] || textValue(item.link) || textValue(item.guid);
    const url = safeNewsUrl(rawLink);
    if (!title || !url || !feed.articleHosts.some(host => new URL(url).hostname === host || new URL(url).hostname.endsWith(`.${host}`))) return [];
    const date = textValue(item.pubDate || item.published || item.updated || item.date);
    const published = Date.parse(date);
    // Undated stories cannot be presented as current daily news.
    if (!Number.isFinite(published) || published > now + 5 * 60 * 1000 || now - published > lookbackHours * 60 * 60 * 1000) return [];
    return [{ title, url, source: feed.source, description: cleanFeedText(item.description || item.summary || item.content || item.encoded), published_at: new Date(published).toISOString(), official: Boolean(feed.official), region: feed.region || 'international' }];
  });
}

const aiTerms = /\b(?:artificial intelligence|machine learning|foundation models?|generative ai|AI|LLMs?|ChatGPT|OpenAI|Anthropic|Claude|DeepSeek|Llama|Gemini|model weights|large language models?)\b/i;
const computeTerms = /\b(?:GPUs?|Nvidia|semiconductors?|chips?|compute|accelerators?)\b/i;
const policyTerms = /\b(?:regulat\w*|legislat\w*|law|laws|act|bill|bills|policy|govern\w*|licen[sc]\w*|approval|compliance|mandatory|copyright|training data|export|restrict\w*|sanction\w*|surveillance|facial recognition|censor\w*|procurement|treat\w*|sovereignty|ban|bans|court|Congress|Parliament)\b/i;
const freedomTerms = /\b(?:open[- ]source|open[- ]weights?|model weights|licen[sc]\w*|approval|compliance|export controls?|restriction\w*|surveillance|censor\w*|training data|copyright|mandatory testing|research|distribut\w*)\b/i;

export function classifyStories(stories) {
  return stories.flatMap(story => {
    const content = `${story.title} ${story.description}`;
    const ai = aiTerms.test(content);
    const policy = policyTerms.test(content);
    if (/\b(?:SNL|Saturday Night Live|satire|parody)\b/i.test(content) && !policy) return [];
    // Compute-only news needs an explicit restriction/export/AI connection.
    if (!ai && !(computeTerms.test(content) && /export|restriction|sanction|ban|AI/i.test(content)) && !/facial recognition|AI surveillance/i.test(content)) return [];
    const score = (aiTerms.test(story.title) ? 5 : 2) + (policy ? 4 : 0) + (freedomTerms.test(content) ? 3 : 0) + (story.official ? 1 : 0) + (/\b(?:EU|European|China|Chinese|US|UK|international|global|treaty)\b/i.test(content) ? 1 : 0);
    return [{ ...story, score }];
  }).sort((a, b) => b.score - a.score || Date.parse(b.published_at) - Date.parse(a.published_at));
}

const stopWords = new Set('the a an and or to of in on for with from by as is are at its new over after says say ai artificial intelligence latest reports report reportedly mount amid string incidents incident going'.split(' '));
const eventAliases = { halts: 'halt', halted: 'halt', pauses: 'halt', paused: 'halt', stopped: 'halt', rogue: 'misalignment', misaligned: 'misalignment' };
const actorGroups = [
  [['us', /\b(?:US|U\.S\.|United States|American)\b/i], ['uk', /\b(?:UK|U\.K\.|Britain|British)\b/i], ['eu', /\b(?:EU|European Union|European parliament)\b/i], ['china', /\b(?:China|Chinese)\b/i], ['india', /\b(?:India|Indian)\b/i]],
  ['OpenAI', 'Anthropic', 'Google', 'Meta', 'DeepSeek', 'Microsoft', 'Nvidia'].map(name => [name, new RegExp(`\\b${name}\\b`, 'i')]),
];
function conflictingActors(left, right) {
  return actorGroups.some(group => {
    const leftActors = group.filter(([, pattern]) => pattern.test(left.title)).map(([name]) => name);
    const rightActors = group.filter(([, pattern]) => pattern.test(right.title)).map(([name]) => name);
    return leftActors.length && rightActors.length && !leftActors.some(name => rightActors.includes(name));
  });
}
function titleTokens(title) {
  return new Set(title.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(word => word.length > 1 && !stopWords.has(word)).map(word => (eventAliases[word] || word).replace(/(?:ing|ed|s)$/, '')));
}
export function sameEvent(left, right) {
  if (left.url === right.url || left.title.toLowerCase() === right.title.toLowerCase()) return true;
  if (conflictingActors(left, right)) return false;
  const leftTokens = titleTokens(left.title), rightTokens = titleTokens(right.title);
  if ((leftTokens.has('approve') && rightTokens.has('reject')) || (leftTokens.has('reject') && rightTokens.has('approve'))) return false;
  const overlap = [...leftTokens].filter(token => rightTokens.has(token)).length;
  return overlap >= 4 && overlap / (leftTokens.size + rightTokens.size - overlap) >= 0.6;
}
export function deduplicateStories(stories) {
  return stories.reduce((unique, story) => {
    if (!unique.some(existing => sameEvent(existing, story))) unique.push(story);
    return unique;
  }, []);
}
export function diverseStories(stories, limit = 24, perSource = 4) {
  const counts = new Map();
  return stories.filter(story => {
    const count = counts.get(story.source) || 0;
    if (count >= perSource) return false;
    counts.set(story.source, count + 1);
    return true;
  }).slice(0, limit);
}
