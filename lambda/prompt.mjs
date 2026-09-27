export const PROMPT_MAX_LENGTH = 400;

const linkPattern = /(?:https?:\/\/|ftp:\/\/|www\.)[^\s<]+|\[[^\]]+\]\([^\s)]+\)|\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:[/?#][^\s<]*)?/i;

export function containsLink(value) {
  return linkPattern.test(String(value || ''));
}

export function validatePrompt(value) {
  const message = String(value || '').trim();
  if (!message) return 'Write a message first.';
  if (message.length > PROMPT_MAX_LENGTH) return `Keep your prompt to ${PROMPT_MAX_LENGTH} characters or fewer.`;
  if (containsLink(message)) return 'Links are not allowed in prompts.';
  return '';
}
