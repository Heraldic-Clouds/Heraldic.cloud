export const SITE_ORIGIN = 'https://www.heraldic.cloud';

export const pageMetadata = {
  home: { path: '/', title: 'Heraldic | Humane AI, Business Agents & AI Freedom Brief', description: 'Build humane AI agents and privacy-respecting cloud solutions with Heraldic. Read the daily AI Freedom Brief on AI policy, regulation and open-source development.' },
  mea: { path: '/mea/', title: 'Mise En Abyme (MEA) | Heraldic Cloud Desktop', description: 'Explore Mise En Abyme cloud desktop services for cloud computing, gaming, work, learning and access.' },
  media: { path: '/media/', title: 'Heraldic Media | MEA Posters & Cloud Desktop Archive', description: 'View Heraldic’s NVIDIA GTC conference posters and cloud desktop, graphics benchmark, and 3D mapping screenshots.' },
  heraldic: { path: '/heraldic/', title: 'Heraldic History | From Cloud Computing to AI', description: 'Explore Heraldic’s history from the 2013 Mise En Abyme cloud desktop idea and early prototypes through NVIDIA GTC research and the company’s transition to AI.' },
  leadership: { path: '/leadership/', title: 'Leadership | Heraldic', description: 'Artem D. is Heraldic’s founder, a computer science graduate, two-time NVIDIA GTC research poster presenter, and CompTIA cloud technology subject matter expert.' },
};

const socialImages = {
  home: { name: 'Heraldic', image: 'HERALDIC2026logo.webp', imageAlt: 'Heraldic company logo' },
  mea: { name: 'Mise En Abyme', image: 'mea/miseenabyme.png', imageAlt: 'Mise En Abyme logo' },
  media: { name: 'Media', image: 'media/gtc2018-mea-poster-preview.jpg', imageAlt: 'NVIDIA GTC 2018 Heraldic cloud desktop poster' },
  heraldic: { name: 'About Heraldic', image: 'mea/mea-effect.jpg', imageAlt: 'Early Mise En Abyme cloud-computing concept artwork' },
  leadership: { name: 'Leadership', image: 'mea/profile.jpeg', imageAlt: 'Portrait of Heraldic founder Artem D.' },
};
for (const page of Object.keys(pageMetadata)) Object.assign(pageMetadata[page], socialImages[page]);

export function pageSchema(page) {
  const details = pageMetadata[page];
  const url = SITE_ORIGIN + details.path;
  const organizationId = SITE_ORIGIN + '/#organization';
  return { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Organization', '@id': organizationId, name: 'Heraldic Clouds Inc.', url: SITE_ORIGIN + '/', logo: SITE_ORIGIN + '/HERALDIC2026logo.webp', description: 'Heraldic pursues humane AI and AI governance, and helps businesses build AI agents for automation alongside cloud computing and privacy-respecting technology.' },
    { '@type': 'WebSite', '@id': SITE_ORIGIN + '/#website', name: 'Heraldic', url: SITE_ORIGIN + '/', inLanguage: 'en-US', publisher: { '@id': organizationId } },
    { '@type': 'WebPage', '@id': url + '#webpage', name: details.title, description: details.description, url, inLanguage: 'en-US', isPartOf: { '@id': SITE_ORIGIN + '/#website' }, about: { '@id': organizationId },
      ...(page === 'home' ? { hasPart: { '@type': 'WebPageElement', '@id': SITE_ORIGIN + '/#ai-freedom-brief', name: 'AI Freedom Brief', description: 'A current daily snapshot of AI policy reporting and clearly labeled AI-written analysis.' } } : {}) },
    ...(page === 'leadership' ? [{ '@type': 'Person', '@id': url + '#artem-d', name: 'Artem D.', image: SITE_ORIGIN + '/mea/profile.jpeg', alumniOf: { '@type': 'CollegeOrUniversity', name: 'Bellevue College' }, worksFor: { '@id': organizationId }, knowsAbout: ['Computer Science', 'Cloud technologies', 'AI governance'] }] : []),
    ...(page !== 'home' ? [{ '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Heraldic', item: SITE_ORIGIN + '/' }, { '@type': 'ListItem', position: 2, name: details.name, item: url }] }] : []),
  ] };
}

export function resolvePagePath(pathname) {
  const normalizePath = (path) => path.replace(/\/+$/, '') || '/';
  const normalizedPath = normalizePath(pathname);
  return Object.entries(pageMetadata).find(([, metadata]) => normalizePath(metadata.path) === normalizedPath)?.[0] || null;
}
