import { PROMPT_MAX_LENGTH } from '../../lambda/prompt.mjs';

export default function ChatPanel({ copy, messages, busy, error, prompt, promptRef, onPromptChange, onSubmit, onClose }) {
  return <aside className="chat-dock chat-visible" aria-label="Artem AI chat">
    <section className="chat-panel is-open" aria-label="Chat with Artem AI">
      <div className="chat-dock-heading"><strong>{copy.artemName}</strong><button type="button" className="chat-dock-close" onClick={onClose} aria-label="Close chat">×</button></div>
      <div className="chat-messages" aria-live="polite">
        {messages.slice(-5).map((message, index) => <p className={`chat-message ${message.role}`} key={`${index}-${message.text.slice(0, 15)}`}><strong>{message.role === 'assistant' ? copy.artemName : copy.youLabel}</strong>{message.text}</p>)}
        {busy && <p className="chat-message assistant"><strong>ARTEM AI</strong>{copy.typingLabel}</p>}
      </div>
      {error && <p className="chat-error" role="alert">{error}</p>}
      <form className="prompt-form" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="artem-prompt">Message Artem AI</label>
        <input id="artem-prompt" ref={promptRef} value={prompt} onChange={(event) => onPromptChange(event.target.value)} maxLength={PROMPT_MAX_LENGTH} aria-describedby="artem-prompt-help" placeholder={copy.promptPlaceholder} disabled={busy} />
        <span id="artem-prompt-help" className="sr-only">Maximum {PROMPT_MAX_LENGTH} characters. Links are not allowed.</span>
        <button type="submit" disabled={busy || !prompt.trim()}>{copy.sendLabel}</button>
      </form>
    </section>
  </aside>;
}
