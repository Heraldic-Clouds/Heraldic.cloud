import { useEffect, useState } from 'react';
import { loadNewsSnapshot } from '../news-feed.mjs';
import FreedomBriefContent from './FreedomBriefContent.jsx';
import './news.css';

export default function DailyFreedomBrief() {
  const [state, setState] = useState({ snapshot: null, loading: true, failed: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    setState(previous => ({ ...previous, loading: true }));
    loadNewsSnapshot({ signal: controller.signal }).then(snapshot => {
      if (active && !controller.signal.aborted) setState({ snapshot, loading: false, failed: false });
    }).catch(() => {
      if (active) setState(previous => ({ ...previous, loading: false, failed: true }));
    }).finally(() => clearTimeout(timeout));
    return () => { active = false; controller.abort(); clearTimeout(timeout); };
  }, [attempt]);
  useEffect(() => {
    const interval = setInterval(() => { if (document.visibilityState === 'visible') setAttempt(value => value + 1); }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  return <FreedomBriefContent {...state} retry={() => setAttempt(value => value + 1)} />;
}
