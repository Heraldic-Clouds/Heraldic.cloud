import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { render } from '../.prerender/entry-server.js';

const template = await readFile('dist/index.html', 'utf8');
const origin = 'https://www.heraldic.cloud';
const pageDetails = {
  home: { path: '/', name: 'Heraldic', title: 'Heraldic | Humane AI, Business Agents & AI Governance', description: 'Heraldic is pursuing humane AI and AI governance, and helps businesses build AI agents for automation alongside cloud computing and privacy-respecting technology.', image: 'HERALDIC2026logo.webp', imageAlt: 'Heraldic company logo' },
  mea: { path: '/mea/', name: 'Mise En Abyme', title: 'Mise En Abyme (MEA) | Heraldic Cloud Desktop', description: 'Explore Mise En Abyme cloud desktop services for cloud computing, gaming, work, learning and access.', image: 'mea/miseenabyme.png', imageAlt: 'Mise En Abyme logo' },
  media: { path: '/media/', name: 'Media', title: 'Heraldic Media | MEA Posters & Cloud Desktop Archive', description: 'View Heraldic’s NVIDIA GTC conference posters and cloud desktop, graphics benchmark, and 3D mapping screenshots.', image: 'media/gtc2018-mea-poster-preview.jpg', imageAlt: 'NVIDIA GTC 2018 Heraldic cloud desktop poster' },
  heraldic: { path: '/heraldic/', name: 'About Heraldic', title: 'Heraldic History | From Cloud Computing to AI', description: 'Explore Heraldic’s history from the 2013 Mise En Abyme cloud desktop idea and early prototypes through NVIDIA GTC research and the company’s transition to AI.', image: 'mea/mea-effect.jpg', imageAlt: 'Early Mise En Abyme cloud-computing concept artwork' },
  leadership: { path: '/leadership/', name: 'Leadership', title: 'Leadership | Heraldic', description: 'Artem D. is Heraldic’s founder, a computer science graduate, two-time NVIDIA GTC research poster presenter, and CompTIA cloud technology subject matter expert.', image: 'mea/profile.jpeg', imageAlt: 'Portrait of Heraldic founder Artem D.' },
};

for (const [page, details] of Object.entries(pageDetails)) {
  const url = origin + details.path;
  const organization = { '@type': 'Organization', '@id': origin + '/#organization', name: 'Heraldic Clouds Inc.', url: origin + '/', logo: origin + '/HERALDIC2026logo.webp', description: 'Heraldic pursues humane AI and AI governance, and helps businesses build AI agents for automation alongside cloud computing and privacy-respecting technology.' };
  const schema = { '@context': 'https://schema.org', '@graph': [
    organization,
    { '@type': 'WebSite', '@id': origin + '/#website', name: 'Heraldic', url: origin + '/', inLanguage: 'en-US', publisher: { '@id': origin + '/#organization' } },
    { '@type': 'WebPage', '@id': url + '#webpage', name: details.title, description: details.description, url, inLanguage: 'en-US', isPartOf: { '@id': origin + '/#website' }, about: { '@id': origin + '/#organization' } },
    ...(page === 'leadership' ? [{ '@type': 'Person', '@id': url + '#artem-d', name: 'Artem D.', image: origin + '/mea/profile.jpeg', alumniOf: { '@type': 'CollegeOrUniversity', name: 'Bellevue College' }, worksFor: { '@id': origin + '/#organization' }, knowsAbout: ['Computer Science', 'Cloud technologies', 'AI governance'] }] : []),
    ...(page !== 'home' ? [{ '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Heraldic', item: origin + '/' }, { '@type': 'ListItem', position: 2, name: details.name, item: url }] }] : []),
  ] };
  const metadata = `<link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" /><meta property="og:site_name" content="Heraldic" />
    <meta property="og:title" content="${details.title}" /><meta property="og:description" content="${details.description}" />
    <meta property="og:url" content="${url}" /><meta property="og:image" content="${origin}/${details.image}" />
    <meta property="og:image:alt" content="${details.imageAlt}" /><meta property="og:locale" content="en_US" />
    <meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="${details.title}" />
    <meta name="twitter:description" content="${details.description}" /><meta name="twitter:image" content="${origin}/${details.image}" />
    <meta name="twitter:image:alt" content="${details.imageAlt}" />
    <script type="application/ld+json">${JSON.stringify(schema).replaceAll('<', '\\u003c')}</script>`;
  const html = template.replace(/<title>.*?<\/title>/, `<title>${details.title}</title>`).replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${details.description}" />`).replace('</head>', metadata + '\n</head>').replace('<div id="root"></div>', () => `<div id="root">${render(page)}</div>`);
  const folder = page === 'home' ? 'dist' : `dist${details.path.slice(0, -1)}`;
  await mkdir(folder, { recursive: true });
  await writeFile(folder + '/index.html', html);
}
