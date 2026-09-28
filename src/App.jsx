import { useEffect, useRef, useState } from 'react';
import siteCopy from './site-copy.json';
import { defaultPalette, paletteKeys, safePalette, safeLayoutPatch, restoreLayout, mergeLayout, inferLayoutPatch, defaultLayout, safeCopy, foreground } from '../lambda/design.mjs';
import { PROMPT_MAX_LENGTH, validatePrompt } from '../lambda/prompt.mjs';

const keys = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];
const navItems = [['overview', 'overview'], ['about', 'about'], ['mea', 'meaLabel'], ['media', 'mediaLabel']];
const navHref = (id) => ['mea', 'media'].includes(id) ? `/${id}/` : ['how-it-works', 'systems'].includes(id) ? `/mea/#${id}` : `/#${id}`;
const initialChat = (copy) => [{ role: 'assistant', text: copy.welcomeMessage }];
const storageKey = 'heraldic-design-v1';
const previousDefaults = {
  heroTitle: 'Nothing is impossible.',
  heroBody: 'Mise En Abyme is Heraldic’s original vision for a personal cloud computer: a desktop experience designed to make capable computing more broadly available.',
  missionBody: 'Heraldic’s founding mission is to help make technology and knowledge available wherever people want to learn, create, and build skills.',
};

export default function App({ page = 'home' }) {
  const screenRef = useRef(null);
  const promptRef = useRef(null);
  const stageRef = useRef(null);
  const [copy, setCopy] = useState(siteCopy);
  const [prompt, setPrompt] = useState('');
  const promptOpen = true;
  const [keyboardVisible, setKeyboardVisible] = useState(true);
  const [theme, setTheme] = useState(null);
  const [messages, setMessages] = useState(() => initialChat(siteCopy));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [layout, setLayout] = useState(defaultLayout);
  const [loaded, setLoaded] = useState(false);
  const [previousDesign, setPreviousDesign] = useState(null);
  const [storageNotice, setStorageNotice] = useState('This site is not tracking you. Design saved only in this browser. No cookies.');
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (saved?.version === 1) {
        setTheme(safePalette(saved.theme));
        setLayout(restoreLayout(saved.layout));
        const edits = safeCopy(saved.copy, siteCopy);
        for (const [key, value] of Object.entries(previousDefaults)) if (edits[key] === value) delete edits[key];
        setCopy({ ...siteCopy, ...edits });
      }
    } catch { setStorageNotice('This site is not tracking you. Changes last for this visit only. No cookies.'); }
    setLoaded(true);
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      if (!theme && layout === defaultLayout && copy === siteCopy) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, JSON.stringify({ version: 1, theme, layout, copy: Object.fromEntries(Object.entries(copy).filter(([key, value]) => siteCopy[key] !== value)) }));
    } catch { setStorageNotice('This site is not tracking you. Changes last for this visit only. No cookies.'); }
  }, [copy, theme, layout, loaded]);
  const resetDesign = () => { setTheme(null); setLayout(defaultLayout); setCopy(siteCopy); setPreviousDesign(null); };
  const undoDesign = () => {
    if (!previousDesign || busy) return;
    setTheme(previousDesign.theme); setLayout(previousDesign.layout); setCopy(previousDesign.copy); setPreviousDesign(null);
  };

  useEffect(() => {
    if (promptOpen) promptRef.current?.focus();
  }, [promptOpen]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    for (const key of paletteKeys) {
      if (theme && safePalette(theme)) stage.style.setProperty(`--palette-${key}`, theme[key]);
      else stage.style.removeProperty(`--palette-${key}`);
    }
    for (const key of ['keyboard', 'key', 'accent']) stage.style.setProperty(`--on-${key}`, foreground((theme || defaultPalette)[key]));
  }, [theme]);

  const goTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const typeKey = (key) => {
    if (key === '⌫') { setPrompt((value) => value.slice(0, -1)); if (promptOpen) promptRef.current?.focus(); return; }
    if (key === 'SPACE') { setPrompt((value) => `${value} `.slice(0, PROMPT_MAX_LENGTH)); if (promptOpen) promptRef.current?.focus(); return; }
    setPrompt((value) => `${value}${key.toLowerCase()}`.slice(0, PROMPT_MAX_LENGTH));
    if (promptOpen) promptRef.current?.focus();
  };

  async function sendMessage(event) {
    event.preventDefault();
    const validationError = validatePrompt(prompt);
    if (validationError || busy) {
      if (validationError) setError(validationError);
      return;
    }
    const text = prompt.trim();
    const nextMessages = [...messages, { role: 'user', text }];
    setMessages(nextMessages);
    setPrompt('');
    setError('');
    setBusy(true);
    const inferredLayout = inferLayoutPatch(text);
    if (inferredLayout) {
      setPreviousDesign({ theme, layout, copy });
      setLayout(current => mergeLayout(current, inferredLayout));
    }
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: nextMessages.slice(-8) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Artem AI is unavailable for a moment. Please try again shortly.');
      const checkedLayout = result.layout == null ? null : safeLayoutPatch(result.layout);
      const checkedTheme = result.theme == null ? null : safePalette(result.theme);
      if ((result.layout != null && !checkedLayout) || (result.theme != null && !checkedTheme)) throw new Error('That design could not be applied safely. Your current design has been kept.');
      const checkedCopy = safeCopy(result.siteCopy, siteCopy);
      if (checkedLayout || checkedTheme || Object.keys(checkedCopy).length) setPreviousDesign({ theme, layout, copy });
      setMessages((current) => [...current, { role: 'assistant', text: result.reply }].slice(-9));
      if (result.siteCopy && Object.keys(result.siteCopy).length) {
        setCopy((current) => ({ ...current, ...checkedCopy }));
        if (result.siteCopy.welcomeMessage) {
          setMessages((current) => current.map((item, index) => index === 0 && item.role === 'assistant' ? { ...item, text: result.siteCopy.welcomeMessage } : item));
        }
        screenRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }
      if (checkedTheme) setTheme(checkedTheme);
      if (checkedLayout) setLayout(current => mergeLayout(current, checkedLayout));
    } catch (cause) {
      setError(cause.message || 'Could not reach Artem AI. Please try again.');
    } finally {
      setBusy(false);
      promptRef.current?.focus();
    }
  }

  const translatedFooter = copy.footerText.replace('{year}', String(new Date().getFullYear()));

  return (
    <main className="desk-stage" ref={stageRef} aria-label="Heraldic" {...Object.fromEntries(Object.entries(layout).map(([key, value]) => [`data-${key}`, value]))}>
      <section className="monitor" aria-label="Heraldic website screen">
        <div className="monitor-top" aria-hidden="true"><span /></div>
        <div className="screen">
          <header className="screen-header">
            <div className="header-stripes" aria-hidden="true" />
            <a className="brand" href="/" aria-label="Heraldic overview"><img src="/HERALDIC2026logo.png" alt="" /><span>HERALDIC</span></a>
            <nav aria-label="Screen navigation">{navItems.map(([id, label]) => <a key={id} href={navHref(id)} aria-current={id === page ? 'page' : undefined}>{copy[label]}</a>)}</nav>
          </header>
          <div className="screen-scroll" ref={screenRef}>
            {page === 'home' && <>
            <section id="overview" className="screen-section home-mission">
              <h1>{copy.heroTitle}</h1>
              <img className="mission-logo" src="/HERALDIC2026logo.png" alt={copy.logoAlt} width="320" height="320" fetchPriority="high" />
              <div className="mission-intro"><p className="eyebrow">{copy.ourMission}</p><p className="lede">{copy.heroBody}</p></div>
              <div className="screen-actions"><a className="primary-action" href="/mea/">{copy.ctaLabel} <span aria-hidden="true">↗</span></a><a className="text-action" href="/media/">{copy.mediaLabel} <span aria-hidden="true">↗</span></a></div>
            </section>
            <section id="about" className="screen-section about-section"><p className="eyebrow">{copy.heraldicLabel}</p><div className="about-layout"><div><h2>{copy.missionTitle}</h2><p>{copy.missionBody}</p></div><div className="quote-block">{copy.missionQuote}</div></div></section>
            <section id="privacy" className="screen-section privacy-section"><p className="eyebrow">{copy.privacyLabel}</p><div className="privacy-layout"><h2>{copy.privacyTitle}</h2><div><p>{copy.privacyBodyOne}</p><p>{copy.privacyBodyTwo}</p></div></div></section>
            </>}
            {page === 'mea' && <>
            <section id="mea" className="screen-section mea-section">
              <div className="mea-heading"><div><p className="eyebrow">{copy.meaEyebrow}</p><h1>{copy.meaTitle}</h1><p className="mea-subtitle">{copy.meaSubtitle}</p><p className="mea-intro">{copy.meaIntro}</p></div><figure className="mea-hero-image"><img src="/mea/beta-cloud-computer.png" alt={copy.meaDesktopAlt} /></figure></div>
              <div className="mea-feature-grid">
                <article><span>01</span><p>{copy.meaFeatureOne}</p></article><article><span>02</span><p>{copy.meaFeatureTwo}</p></article><article><span>03</span><p>{copy.meaFeatureThree}</p></article><article><span>04</span><p>{copy.meaFeatureFour}</p></article><article><span>05</span><p>{copy.meaFeatureFive}</p></article><article><span>06</span><p>{copy.meaFeatureSix}</p></article>
              </div>
              <div className="mea-heritage-strip" aria-label={copy.meaHeritageLabel}><img src="/mea/web3.png" alt={copy.meaWeb3Alt} /><img src="/mea/ipv6-launch.png" alt={copy.meaIpv6Alt} /></div>
            </section>
            <section id="how-it-works" className="screen-section story-section">
              <p className="eyebrow">{copy.originalIdea}</p><div className="section-heading"><h2>{copy.capabilityTitle}</h2><p>{copy.capabilityBody}</p></div>
              <div className="capability-grid"><article><span>01</span><h3>{copy.capabilityOneTitle}</h3><p>{copy.capabilityOneBody}</p></article><article><span>02</span><h3>{copy.capabilityTwoTitle}</h3><p>{copy.capabilityTwoBody}</p></article><article><span>03</span><h3>{copy.capabilityThreeTitle}</h3><p>{copy.capabilityThreeBody}</p></article></div>
            </section>
            <section id="systems" className="screen-section systems-section">
              <div className="section-heading"><p className="eyebrow">{copy.meaSystems}</p><h2>{copy.systemsTitle}</h2><p>{copy.systemsBody}</p></div>
              <div className="system-grid"><article className="system-card"><div className="system-number">01</div><p className="card-kicker">{copy.eleetName}</p><h3>{copy.eleetTitle}</h3><p>{copy.eleetBody}</p><ul><li>{copy.eleetBulletOne}</li><li>{copy.eleetBulletTwo}</li><li>{copy.eleetBulletThree}</li></ul></article><article className="system-card"><div className="system-number">02</div><p className="card-kicker">{copy.powerName}</p><h3>{copy.powerTitle}</h3><p>{copy.powerBody}</p><ul><li>{copy.powerBulletOne}</li><li>{copy.powerBulletTwo}</li><li>{copy.powerBulletThree}</li></ul></article><article className="system-card"><div className="system-number">03</div><p className="card-kicker">{copy.newbieName}</p><h3>{copy.newbieTitle}</h3><p>{copy.newbieBody}</p><ul><li>{copy.newbieBulletOne}</li><li>{copy.newbieBulletTwo}</li><li>{copy.newbieBulletThree}</li></ul></article></div>
            </section>
            </>}
            {page === 'media' && <section id="media" className="screen-section media-section">
              <p className="eyebrow">{copy.mediaEyebrow}</p><h1>{copy.mediaTitle}</h1><p className="lede">{copy.mediaIntro}</p>
              <div className="media-grid">
                {[['GTC2017MEAposter.pdf', 'gtc2017-preview.png', 'gtcPosterTitle', 'gtcPosterAlt', '62.1 MiB'], ['Mise_En_Abyme_Cloud_Primary_personal_Computers.pdf', 'mea-computers-preview.png', 'meaPosterTitle', 'meaPosterAlt', '5.9 MiB']].map(([file, preview, title, alt, size]) => <article className="media-card" key={file}>
                  <a className="poster-preview" href={`/media/${file}`} target="_blank" rel="noopener noreferrer" aria-label={`${copy.openPdf}: ${copy[title]}`}><img src={`/media/${preview}`} alt={copy[alt]} loading="lazy" decoding="async" width="1100" height="1100" /></a>
                  <h2>{copy[title]}</h2><p className="media-size">PDF · {size}</p>
                  <div className="screen-actions"><a className="primary-action" href={`/media/${file}`} target="_blank" rel="noopener noreferrer">{copy.openPdf}</a><a className="text-action" href={`/media/${file}`} download>{copy.downloadPdf}</a></div>
                </article>)}
              </div><p className="mea-note">{copy.mediaNote}</p>
            </section>}
          </div>
          <div className="screen-footer" aria-hidden="true" />
        </div>
        <div className="monitor-stand" aria-hidden="true"><div /></div>
      </section>

      <footer className="keyboard-footer" aria-label="Heraldic keyboard and Artem AI">
        <div className="keyboard-shell">
          <div className="keyboard-topline">{keyboardVisible ? <button type="button" className="keyboard-close" onClick={() => setKeyboardVisible(false)} aria-label="Close keyboard">×</button> : <button type="button" className="keyboard-reopen" onClick={() => setKeyboardVisible(true)}>Open keyboard</button>}</div>
          <div className={`keyboard-body chat-open${keyboardVisible ? '' : ' keyboard-closed'}`}>
            <section className="chat-panel is-open" aria-label="Chat with Artem AI">
              <div className="chat-messages" aria-live="polite">
                {messages.slice(-5).map((message, index) => <p className={`chat-message ${message.role}`} key={`${index}-${message.text.slice(0, 15)}`}><strong>{message.role === 'assistant' ? copy.artemName : copy.youLabel}</strong>{message.text}</p>)}
                {busy && <p className="chat-message assistant"><strong>ARTEM AI</strong>{copy.typingLabel}</p>}
              </div>
              {error && <p className="chat-error" role="alert">{error}</p>}
              <form className="prompt-form" onSubmit={sendMessage}>
                <label className="sr-only" htmlFor="artem-prompt">Message Artem AI</label>
                <input id="artem-prompt" ref={promptRef} value={prompt} onChange={(event) => setPrompt(event.target.value.slice(0, PROMPT_MAX_LENGTH))} maxLength={PROMPT_MAX_LENGTH} aria-describedby="artem-prompt-help" placeholder={copy.promptPlaceholder} disabled={busy} />
                <span id="artem-prompt-help" className="sr-only">Maximum {PROMPT_MAX_LENGTH} characters. Links are not allowed.</span>
                <button type="submit" disabled={busy || !prompt.trim()}>{copy.sendLabel}</button>
              </form>
            </section>
            {keyboardVisible && <div className="keyboard" role="group" aria-label="On-screen typing keyboard">
              {keys.map((row, index) => <div className={`key-row row-${index + 1}`} key={row.join('')}>{row.map((key) => <button key={key} onClick={() => typeKey(key)} aria-label={`Type ${key}`}>{key}</button>)}</div>)}
              <div className="key-row bottom-row"><button className="utility-key" onClick={() => typeKey('⌫')} aria-label="Delete last character">⌫</button><button className="wide-key" onClick={() => typeKey('SPACE')}>SPACE</button><button className="utility-key" onClick={() => sendMessage({ preventDefault() {} })} aria-label="Send prompt">↵</button></div>
            </div>}
          </div>
          <div className="keyboard-footer-line"><span>{translatedFooter}</span><span>{storageNotice} {previousDesign && <button type="button" disabled={busy} onClick={undoDesign}>Undo design</button>} <button type="button" disabled={busy} onClick={resetDesign}>Reset design</button></span></div>
        </div>
      </footer>
    </main>
  );
}
