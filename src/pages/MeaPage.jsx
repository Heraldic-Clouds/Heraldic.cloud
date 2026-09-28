export default function MeaPage({ copy }) {
  return <>
    <section id="mea" className="screen-section mea-section">
      <div className="mea-heading"><div><h1 className="sr-only">Mise En Abyme</h1><img className="mea-wordmark" src="/mea/miseenabyme.png" alt="Mise En Abyme" /><p className="mea-subtitle">{copy.meaSubtitle}</p><p className="mea-intro">{copy.meaIntro}</p></div></div>
      <div className="mea-feature-grid">
        <article><img className="mea-feature-image" src="/mea/mea-desktop.png" alt="Mise En Abyme desktop interface" loading="lazy" decoding="async" /><p>{copy.meaFeatureOne}</p></article><article><img className="mea-feature-image" src="/mea/cloud-desktop.png" alt="" loading="lazy" decoding="async" /><p>{copy.meaFeatureTwo}</p></article><article><img className="mea-feature-image" src="/mea/mobile-app-icon.png" alt="" loading="lazy" decoding="async" /><p>{copy.meaFeatureThree}</p></article>
      </div>
    </section>
    <section id="how-it-works" className="screen-section story-section">
      <p className="eyebrow">{copy.originalIdea}</p><p className="mea-capability-intro">{copy.capabilityBody}</p>
      <div className="capability-grid"><article><img className="mea-feature-image" src="/mea/droste-effect.png" alt="Nested cloud-computer windows and keyboards" loading="lazy" decoding="async" /><h3>{copy.capabilityOneTitle}</h3><p>{copy.capabilityOneBody}</p></article><article><img className="mea-feature-image" src="/mea/MEA-button2.png" alt="Illustration of a desktop computer and keyboard" loading="lazy" decoding="async" /><h3>{copy.capabilityTwoTitle}</h3><p>{copy.capabilityTwoBody}</p></article><article><img className="mea-feature-image" src="/mea/MEA-button1.png" alt="" loading="lazy" decoding="async" /><h3>{copy.capabilityThreeTitle}</h3><p>{copy.capabilityThreeBody}</p></article></div>
    </section>
    <section id="systems" className="screen-section systems-section">
      <div className="section-heading mea-systems-heading"><p className="eyebrow">{copy.meaSystems}</p><p>{copy.systemsBody}</p><img src="/mea/mea-desktop.png" alt="Mise En Abyme desktop interface" loading="lazy" decoding="async" /></div>
      <div className="system-grid"><article className="system-card"><p className="card-kicker">{copy.eleetName}</p><h3>{copy.eleetTitle}</h3><p>{copy.eleetBody}</p><ul><li>{copy.eleetBulletOne}</li><li>{copy.eleetBulletTwo}</li><li>{copy.eleetBulletThree}</li></ul></article><article className="system-card"><p className="card-kicker">{copy.powerName}</p><h3>{copy.powerTitle}</h3><p>{copy.powerBody}</p><ul><li>{copy.powerBulletOne}</li><li>{copy.powerBulletTwo}</li><li>{copy.powerBulletThree}</li></ul></article><article className="system-card"><p className="card-kicker">{copy.newbieName}</p><h3>{copy.newbieTitle}</h3><p>{copy.newbieBody}</p><ul><li>{copy.newbieBulletOne}</li><li>{copy.newbieBulletTwo}</li><li>{copy.newbieBulletThree}</li></ul></article></div>
    </section>
  </>;
}
