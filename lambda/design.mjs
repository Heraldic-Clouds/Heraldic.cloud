// Only data from this finite vocabulary can affect presentation. Never execute AI output.
export const defaultPalette = { page: '#eafaff', screen: '#effbfe', text: '#102e46', muted: '#426b7e', accent: '#167b9e', accent2: '#4b0082', frame: '#14384f', card: '#ffffff', keyboard: '#123d52', key: '#1a526a' };
export const paletteKeys = Object.keys(defaultPalette);
export const layoutOptions = { density: ['comfortable', 'compact', 'airy'], width: ['wide', 'focused'], typography: ['sans', 'serif', 'mono'], cards: ['grid', 'list', 'two-column'], hero: ['default', 'stacked', 'split', 'logo-right'], corners: ['soft', 'square'], alignment: ['default', 'left', 'center'], textscale: ['standard', 'large'], logosize: ['standard', 'small', 'large'] };
export const defaultLayout = Object.fromEntries(Object.entries(layoutOptions).map(([key, values]) => [key, values[0]]));
export function safeLayoutPatch(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const patch = {};
  for (const [key, option] of Object.entries(value)) {
    if (!Object.hasOwn(layoutOptions, key) || (option !== null && !layoutOptions[key].includes(option))) return null;
    if (option !== null) patch[key] = option;
  }
  return Object.keys(patch).length ? patch : null;
}
export function mergeLayout(current, patch) {
  const checked = safeLayoutPatch(patch);
  return checked ? { ...defaultLayout, ...(safeLayout(current) || {}), ...checked } : current;
}
// Accept earlier saved designs, filling newly introduced controls with defaults.
export function restoreLayout(value) {
  const checked = safeLayoutPatch(value);
  return checked ? { ...defaultLayout, ...checked } : defaultLayout;
}
export function inferLayoutPatch(message) {
  if (typeof message !== 'string' || forbiddenRequest(message)) return null;
  const text = message.normalize('NFKC').toLowerCase();
  const patch = {};
  const set = (key, value) => { if (layoutOptions[key].includes(value)) patch[key] = value; };
  if (/\b(airy|spacious|more\s+space|loose)\b/.test(text)) set('density', 'airy');
  if (/\b(compact|dense|tighter|less\s+space)\b/.test(text)) set('density', 'compact');
  if (/\b(wide|full\s+width)\b/.test(text)) set('width', 'wide');
  if (/\b(focused|narrow|centered\s+column)\b/.test(text)) set('width', 'focused');
  if (/\b(serif|editorial)\b/.test(text)) set('typography', 'serif');
  if (/\b(monospaced?|terminal|developer)\b/.test(text)) set('typography', 'mono');
  if (/\b(sans[- ]?serif|modern\s+font)\b/.test(text)) set('typography', 'sans');
  if (/\b(two[- ]?column|two\s+columns|2\s+columns)\b/.test(text)) set('cards', 'two-column');
  else if (/\b(list|single\s+column)\b/.test(text)) set('cards', 'list');
  else if (/\b(grid|cards?\s+across)\b/.test(text)) set('cards', 'grid');
  if (/\b(logo|hero).{0,30}\b(right|rhs)\b|\b(right|rhs).{0,30}\b(logo|hero)\b/.test(text)) set('hero', 'logo-right');
  else if (/\b(logo|hero).{0,30}\b(left|split|beside|side)\b|\b(side[- ]by[- ]side|split)\b/.test(text)) set('hero', 'split');
  else if (/\b(stack|stacked|above|logo\s+on\s+top)\b/.test(text)) set('hero', 'stacked');
  if (/\b(square|sharp)\s+(corners?|edges?)\b/.test(text)) set('corners', 'square');
  if (/\b(round|rounded|soft)\s+(corners?|edges?)\b/.test(text)) set('corners', 'soft');
  if (/\b(left[- ]align|aligned\s+left)\b/.test(text)) set('alignment', 'left');
  if (/\b(center[- ]align|centered|centre[d]?)\b/.test(text)) set('alignment', 'center');
  if (/\b(large|bigger|larger)\s+(text|type|font)\b/.test(text)) set('textscale', 'large');
  if (/\b(small|smaller)\s+(logo|brand)\b/.test(text)) set('logosize', 'small');
  if (/\b(large|big|bigger|larger)\s+(logo|brand)\b/.test(text)) set('logosize', 'large');
  return Object.keys(patch).length ? patch : null;
}
export function safeLayout(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== Object.keys(layoutOptions).length) return null;
  return Object.entries(layoutOptions).every(([key, options]) => options.includes(value[key])) ? Object.fromEntries(Object.keys(layoutOptions).map(key => [key, value[key]])) : null;
}
function luminance(hex) {
  const values = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
}
export function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
export const foreground = background => contrast('#ffffff', background) >= contrast('#000000', background) ? '#ffffff' : '#000000';
export function safePalette(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== paletteKeys.length || !paletteKeys.every(key => /^#[0-9a-f]{6}$/i.test(value[key]))) return null;
  if (!['page', 'screen', 'card'].every(key => contrast(value.text, value[key]) >= 4.5 && contrast(value.muted, value[key]) >= 4.5)) return null;
  return Object.fromEntries(paletteKeys.map(key => [key, value[key]]));
}
export function safeCopy(value, template) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key, text]) => Object.hasOwn(template, key) && typeof text === 'string' && text.trim() && text.length <= 1600 && !/[<>]|https?:\/\/|javascript:/i.test(text)));
}
export function forbiddenRequest(message) {
  const normalized = message.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ');
  return /\b(add|create|build|generate|insert)\s+(?:(?:a|an|the|another|brand|new|extra|landing|contact|login|payment)\s+){0,5}(pages?|routes?)\b|\b(cookies?|trackers?|keyloggers?|malware|phishing|javascript|eval|iframe)\b|\b(disable|remove|bypass|hide)\b.{0,50}\b(security|csp|rate.?limit|privacy|navigation|safety)\b|<\s*script/i.test(normalized);
}
export const refusal = 'I can personalize the existing layout, colors and language, but cannot add pages, execute code, enable cookies or tracking, or weaken security and accessibility.';
