import React from 'react';
import { NEWS_STALE_AFTER_MS } from '../../shared/news-snapshot.mjs';

function SourceLink({ story }) {
  return <a href={story.url} target="_blank" rel="noopener noreferrer" aria-label={`Read the report from ${story.source} (opens in a new tab)`}>{story.source} <span aria-hidden="true">↗</span></a>;
}

export default function FreedomBriefContent({ snapshot, loading = false, failed = false, retry, now = Date.now() }) {
  const stale = snapshot && now - Date.parse(snapshot.generated_at) > NEWS_STALE_AFTER_MS;
  return <section id="ai-freedom-brief" className="screen-section news-section" aria-labelledby="freedom-brief-heading">
    <p className="eyebrow">Daily AI &amp; policy</p><h2 id="freedom-brief-heading">AI Freedom Brief</h2>
    <p>Reporting and analysis on the freedom to develop, distribute, and use AI.</p>
    {!snapshot ? <div className="news-status" role="status" aria-live="polite">
      <p>{loading ? 'Loading the latest brief…' : 'The daily brief is not available yet. Please check back later.'}</p>
      {!loading && retry && <button type="button" className="text-action" onClick={retry}>Try again</button>}
    </div> : <>
      <p className="news-timestamp">Last published: <time dateTime={snapshot.generated_at}>{new Date(snapshot.generated_at).toISOString().replace('T', ' ').slice(0, 16)} UTC</time></p>
      {(stale || failed) && <p className="news-status" role="status">{stale ? 'An update is overdue. This is the last published brief, not today’s news.' : 'The latest refresh is unavailable. Showing the last loaded brief.'}</p>}
      <article className="news-featured">
        <h3>{snapshot.featured.title}</h3>
        <h4>Summary</h4><p>{snapshot.featured.summary}</p>
        <h4>Freedom analysis</h4>{snapshot.featured.critique.split(/\n\s*\n/u).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        <p className="news-source">Source: <SourceLink story={snapshot.featured} /></p>
        <p className="news-disclosure">AI-written summary and analysis based on the linked reporting. Read the source for full context.</p>
      </article>
    </>}
  </section>;
}
