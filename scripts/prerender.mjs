import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { render } from '../.prerender/entry-server.js';
const template = await readFile('dist/index.html', 'utf8');
const origin = 'https://www.heraldic.cloud';
for (const page of ['home', 'mea', 'media']) {
  const path = page === 'home' ? '/' : `/${page}/`;
  const url = origin + path;
  const title = page === 'home' ? 'Heraldic | Humane AI, Cloud Computing & AI Governance' : page === 'media' ? 'NVIDIA GTC MEA Posters | Heraldic' : 'Mise En Abyme (MEA) | Heraldic Cloud Desktop';
  const description = page === 'home' ? 'Heraldic builds humane AI, AI governance solutions, cloud computing, business automation, gaming cloud desktops and AI social media in service of humanity.' : page === 'media' ? 'Explore Mise En Abyme posters presented at NVIDIA GTC, with PDF downloads from Heraldic.' : 'Explore Mise En Abyme cloud desktop services for cloud computing, gaming, work, learning and access.';
  const schema = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Organization', '@id': origin + '/#organization', name: 'Heraldic Clouds Inc.', url: origin + '/', logo: origin + '/HERALDIC2026.png', description: 'Heraldic builds humane AI, AI governance solutions and cloud computing services in service of humanity.', address: { '@type': 'PostalAddress', streetAddress: '23515 NE Novelty Hill Rd Ste B221 PMB 267', addressLocality: 'Redmond', addressRegion: 'WA', postalCode: '98053', addressCountry: 'US' } },
    { '@type': 'WebSite', '@id': origin + '/#website', name: 'Heraldic', url: origin + '/', inLanguage: 'en-US', publisher: { '@id': origin + '/#organization' } },
    { '@type': 'WebPage', '@id': url + '#webpage', name: title, description, url, inLanguage: 'en-US', isPartOf: { '@id': origin + '/#website' }, about: { '@id': origin + '/#organization' } },
    ...(page !== 'home' ? [{ '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Heraldic', item: origin + '/' }, { '@type': 'ListItem', position: 2, name: page === 'mea' ? 'MEA' : 'Media', item: url }] }] : [])
  ] };
  const metadata = `<link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" /><meta property="og:site_name" content="Heraldic" />
    <meta property="og:title" content="${title}" /><meta property="og:description" content="${description}" />
    <meta property="og:url" content="${url}" /><meta property="og:image" content="${origin}/HERALDIC2026.png" />
    <meta property="og:image:alt" content="Heraldic company logo" /><meta property="og:locale" content="en_US" />
    <meta name="twitter:card" content="summary" /><meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" /><meta name="twitter:image" content="${origin}/HERALDIC2026.png" />
    <meta name="twitter:image:alt" content="Heraldic company logo" />
    <script type="application/ld+json">${JSON.stringify(schema).replaceAll('<', '\\u003c')}</script>`;
  const html = template.replace(/<title>.*?<\/title>/, `<title>${title}</title>`).replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${description}" />`).replace('</head>', metadata + '\n</head>').replace('<div id="root"></div>', () => `<div id="root">${render(page)}</div>`);
  const folder = page === 'home' ? 'dist' : `dist/${page}`;
  await mkdir(folder, { recursive: true });
  await writeFile(folder + '/index.html', html);
}
