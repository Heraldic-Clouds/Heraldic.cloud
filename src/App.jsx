import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import siteCopy from './site-copy.json';
import VirtualKeyboard from './components/VirtualKeyboard.jsx';
import { pageMetadata, resolvePagePath } from './page-routes.mjs';
import { defaultPalette, paletteKeys, safePalette, safeLayoutPatch, restoreLayout, mergeLayout, inferLayoutPatch, defaultLayout, safeCopy, foreground } from '../lambda/design.mjs';
import { PROMPT_MAX_LENGTH, validatePrompt } from '../lambda/prompt.mjs';

const ChatPanel = lazy(() => import('./components/ChatPanel.jsx'));
const initialChat = (copy) => [{ role: 'assistant', text: copy.welcomeMessage }];
const storageKey = 'heraldic-design-v1';
const previousDefaults = {
  heroTitle: 'Nothing is impossible.',
  heroBody: 'Mise En Abyme is Heraldic’s original vision for a personal cloud computer: a desktop experience designed to make capable computing more broadly available.',
  missionBody: 'Heraldic’s founding mission is to help make technology and knowledge available wherever people want to learn, create, and build skills.',
};

export default function App({ page = 'home', PageContent, routePageComponents = {}, routePageLoaders = {} }) {
  const screenRef = useRef(null);
  const promptRef = useRef(null);
  const stageRef = useRef(null);
  const [copy, setCopy] = useState(siteCopy);
  const [prompt, setPrompt] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [theme, setTheme] = useState(null);
  const [messages, setMessages] = useState(() => initialChat(siteCopy));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [layout, setLayout] = useState(defaultLayout);
  const [loaded, setLoaded] = useState(false);
  const [previousDesign, setPreviousDesign] = useState(null);
  const [storageNotice, setStorageNotice] = useState('This site is not tracking you. Design saved only in this browser. No cookies.');
  const [chatVisible, setChatVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(page);
  const [currentPageContent, setCurrentPageContent] = useState(() => PageContent);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    if (location.hash) screenRef.current?.querySelector(`#${CSS.escape(decodeURIComponent(location.hash.slice(1)))}`)?.scrollIntoView();
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      if (!theme && layout === defaultLayout && copy === siteCopy) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, JSON.stringify({ version: 1, theme, layout, copy: Object.fromEntries(Object.entries(copy).filter(([key, value]) => siteCopy[key] !== value)) }));
    } catch { setStorageNotice('This site is not tracking you. Changes last for this visit only. No cookies.'); }
  }, [copy, theme, layout, loaded]);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 721px)');
    const syncChatVisibility = () => setChatVisible(desktop.matches);
    syncChatVisibility();
    desktop.addEventListener('change', syncChatVisibility);
    return () => desktop.removeEventListener('change', syncChatVisibility);
  }, []);
  useEffect(() => {
    const handleHistoryNavigation = () => {
      setMobileMenuOpen(false);
      const destination = new URL(window.location.href);
      const nextPage = resolvePagePath(destination.pathname);
      if (!nextPage) return;
      setCurrentPage(nextPage);
      if (routePageComponents[nextPage]) setCurrentPageContent(() => routePageComponents[nextPage]);
      updatePageMetadata(nextPage, destination);
      routePageLoaders[nextPage]?.().then(() => requestAnimationFrame(() => {
        screenRef.current?.scrollTo({ top: 0, behavior: 'auto' });
        if (destination.hash) screenRef.current?.querySelector(`#${CSS.escape(decodeURIComponent(destination.hash.slice(1)))}`)?.scrollIntoView({ block: 'start' });
      }));
    };
    window.addEventListener('popstate', handleHistoryNavigation);
    return () => window.removeEventListener('popstate', handleHistoryNavigation);
  }, []);
  useEffect(() => {
    if (chatVisible) promptRef.current?.focus();
  }, [chatVisible]);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    for (const key of paletteKeys) {
      if (theme && safePalette(theme)) stage.style.setProperty(`--palette-${key}`, theme[key]);
      else stage.style.removeProperty(`--palette-${key}`);
    }
    for (const key of ['keyboard', 'key', 'accent']) stage.style.setProperty(`--on-${key}`, foreground((theme || defaultPalette)[key]));
  }, [theme]);

  const resetDesign = () => { setTheme(null); setLayout(defaultLayout); setCopy(siteCopy); setPreviousDesign(null); };
  const undoDesign = () => {
    if (!previousDesign || busy) return;
    setTheme(previousDesign.theme); setLayout(previousDesign.layout); setCopy(previousDesign.copy); setPreviousDesign(null);
  };
  const updatePageMetadata = (nextPage, destination) => {
    const metadata = pageMetadata[nextPage];
    if (!metadata) return;
    document.title = metadata.title;
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', new URL(metadata.path, destination.origin).href);
    document.querySelector('meta[name="description"]')?.setAttribute('content', metadata.description);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', metadata.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', metadata.description);
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', new URL(metadata.path, destination.origin).href);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', metadata.title);
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', metadata.description);
  };
  const navigateTo = (destination, addHistoryEntry = true) => {
    const nextPage = resolvePagePath(destination.pathname);
    if (!nextPage) return;
    if (addHistoryEntry) window.history.pushState({}, '', `${destination.pathname}${destination.search}${destination.hash}`);
    setCurrentPage(nextPage);
    if (routePageComponents[nextPage]) setCurrentPageContent(() => routePageComponents[nextPage]);
    updatePageMetadata(nextPage, destination);
    screenRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    routePageLoaders[nextPage]?.().then(() => requestAnimationFrame(() => {
      screenRef.current?.scrollTo({ top: 0, behavior: 'auto' });
      if (destination.hash) screenRef.current?.querySelector(`#${CSS.escape(decodeURIComponent(destination.hash.slice(1)))}`)?.scrollIntoView({ block: 'start' });
    }));
  };
  const handleNavigation = (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!anchor || anchor.target || anchor.hasAttribute('download')) return;
    const destination = new URL(anchor.href, window.location.href);
    if (destination.origin !== window.location.origin || !resolvePagePath(destination.pathname)) return;
    event.preventDefault();
    setMobileMenuOpen(false);
    if (destination.href !== window.location.href) navigateTo(destination);
  };
  const typeKey = (key) => {
    if (key === '⌫') setPrompt((value) => value.slice(0, -1));
    else if (key === 'SPACE') setPrompt((value) => `${value} `.slice(0, PROMPT_MAX_LENGTH));
    else setPrompt((value) => `${value}${key.toLowerCase()}`.slice(0, PROMPT_MAX_LENGTH));
    if (chatVisible) promptRef.current?.focus();
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
      setLayout((current) => mergeLayout(current, inferredLayout));
    }
    try {
      const response = await fetch('/api/chat', { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, history: nextMessages.slice(-8) }) });
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
        if (result.siteCopy.welcomeMessage) setMessages((current) => current.map((item, index) => index === 0 && item.role === 'assistant' ? { ...item, text: result.siteCopy.welcomeMessage } : item));
        screenRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }
      if (checkedTheme) setTheme(checkedTheme);
      if (checkedLayout) setLayout((current) => mergeLayout(current, checkedLayout));
    } catch (cause) {
      setError(cause.message || 'Could not reach Artem AI. Please try again.');
    } finally {
      setBusy(false);
      promptRef.current?.focus();
    }
  }

  const translatedFooter = copy.footerText.replace('{year}', String(new Date().getFullYear()));
  const ActivePageContent = currentPageContent;
  return <main className="desk-stage" onClick={handleNavigation} ref={stageRef} aria-label="Heraldic" {...Object.fromEntries(Object.entries(layout).map(([key, value]) => [`data-${key}`, value]))}>
    <div className="desk-main">
      {chatVisible && <Suspense fallback={<aside className="chat-dock chat-panel-loading" role="status">Opening chat…</aside>}><ChatPanel copy={copy} messages={messages} busy={busy} error={error} prompt={prompt} promptRef={promptRef} onPromptChange={(value) => setPrompt(value.slice(0, PROMPT_MAX_LENGTH))} onSubmit={sendMessage} onClose={() => setChatVisible(false)} /></Suspense>}
      <button className="chat-launcher" type="button" onClick={() => { setChatVisible(true); promptRef.current?.focus(); }} aria-label="Open Artem AI chat">Chat</button>
      <div className="workstation"><section className="monitor" aria-label="Heraldic website screen">
        <div className="monitor-top" aria-hidden="true"><span /></div>
        <div className="screen">
          <header className="screen-header">
            <div className="header-stripes" aria-hidden="true" />
            <a className="brand" href="/" aria-label="Heraldic overview"><img src="/HERALDIC2026logo.webp" alt="" /><span>HERALDIC</span></a>
            <button className="mobile-nav-toggle" type="button" aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileMenuOpen} aria-controls="screen-navigation" onClick={() => setMobileMenuOpen((open) => !open)}><span /><span /><span /></button>
            <nav id="screen-navigation" className={mobileMenuOpen ? 'mobile-open' : ''} aria-label="Screen navigation" onClick={() => setMobileMenuOpen(false)}>
              <a href="/#overview" aria-current={currentPage === 'home' ? 'page' : undefined}>{copy.overview}</a>
              <div className="nav-menu"><a href="/heraldic/" aria-current={currentPage === 'heraldic' ? 'page' : undefined}>{copy.about}</a><div className="nav-submenu"><a href="/leadership/" aria-current={currentPage === 'leadership' ? 'page' : undefined}>Leadership</a></div></div>
              <a href="/mea/" aria-current={currentPage === 'mea' ? 'page' : undefined}>{copy.meaLabel}</a>
              <a href="/media/" aria-current={currentPage === 'media' ? 'page' : undefined}>{copy.mediaLabel}</a>
            </nav>
          </header>
          <div className="screen-scroll" ref={screenRef}>
            <Suspense fallback={<div className="page-loading" role="status">Loading page…</div>}>{ActivePageContent && <ActivePageContent copy={copy} />}</Suspense>
          </div>
          <div className="screen-footer" aria-hidden="true" />
        </div>
        <div className="monitor-stand" aria-hidden="true"><div /></div>
      </section>
      <VirtualKeyboard visible={keyboardVisible} onClose={() => setKeyboardVisible(false)} onOpen={() => setKeyboardVisible(true)} onType={typeKey} onSend={() => sendMessage({ preventDefault() {} })} />
      </div>
    </div>
      <footer className="site-footer"><span>{translatedFooter}</span><span>{storageNotice} {previousDesign && <button type="button" disabled={busy} onClick={undoDesign}>Undo design</button>} <button type="button" disabled={busy} onClick={resetDesign}>Reset design</button></span></footer>
  </main>;
}
