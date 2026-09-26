// Only data from this finite vocabulary can affect presentation. Never execute AI output.
export const defaultPalette = { page: '#eafaff', screen: '#effbfe', text: '#102e46', muted: '#426b7e', accent: '#167b9e', accent2: '#4b0082', frame: '#14384f', card: '#ffffff', keyboard: '#123d52', key: '#1a526a' };
export const paletteKeys = Object.keys(defaultPalette);
export const layoutOptions = { density: ['comfortable', 'compact', 'airy'], width: ['wide', 'focused'], typography: ['sans', 'serif', 'mono'], cards: ['grid', 'list'], hero: ['split', 'stacked'], corners: ['soft', 'square'] };
export const defaultLayout = Object.fromEntries(Object.entries(layoutOptions).map(([key, values]) => [key, values[0]]));
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
  return /\b(add|create|build|generate|insert)\b.{0,40}\b(new\s+)?(page|pages|route|routes)\b|\b(cookies?|trackers?|keyloggers?|malware|phishing|javascript|eval|iframe)\b|\b(disable|remove|bypass|hide)\b.{0,50}\b(security|csp|rate.?limit|privacy|navigation|safety)\b|<\s*script/i.test(message);
}
export const refusal = 'I can personalize the existing layout, colors and language, but cannot add pages, execute code, enable cookies or tracking, or weaken security and accessibility.';
