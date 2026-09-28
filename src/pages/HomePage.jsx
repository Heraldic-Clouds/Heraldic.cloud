export default function HomePage({ copy }) {
  return <>
    <section id="overview" className="screen-section home-mission">
      <h1>{copy.heroTitle}</h1>
      <img className="mission-logo" src="/HERALDIC2026logo.webp" alt={copy.logoAlt} width="320" height="320" fetchPriority="high" />
      <div className="mission-intro"><p className="eyebrow">{copy.ourMission}</p><p className="lede">{copy.heroBody}</p></div>
      <div className="screen-actions"><a className="primary-action" href="/mea/">{copy.ctaLabel} <span aria-hidden="true">↗</span></a><a className="text-action" href="/media/">{copy.mediaLabel} <span aria-hidden="true">↗</span></a></div>
    </section>
    <section id="about" className="screen-section about-section"><p className="eyebrow">{copy.heraldicLabel}</p><div className="about-layout"><div><h2>{copy.missionTitle}</h2><p>{copy.missionBody}</p></div><img className="mission-art" src="/mea/ai-agents.webp" alt="AI agents illustration" loading="lazy" decoding="async" /></div></section>
    <section id="privacy" className="screen-section privacy-section"><p className="eyebrow">{copy.privacyLabel}</p><div className="privacy-layout"><h2>{copy.privacyTitle}</h2><div><p>{copy.privacyBodyOne}</p></div></div><img className="privacy-skyline" src="/mea/skyline-kyev-tokyo-buenosaires-amsterdam-jerusalem.webp" alt="Illustrated skyline connecting cities around the world" loading="lazy" decoding="async" /></section>
  </>;
}
