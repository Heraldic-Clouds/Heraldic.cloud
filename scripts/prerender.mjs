import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { render } from '../.prerender/entry-server.js';
const template = await readFile('dist/index.html', 'utf8');
const origin = 'https://www.heraldic.cloud';
for (const page of ['home', 'mea', 'media']) {
  const path = page === 'home' ? '/' : `/${page}/`;
  const url = origin + path;
  const title = page === 'home' ? 'Heraldic | AGI, MEA Cloud Desktops & PeopleWelcome' : page === 'media' ? 'Media & Original MEA Posters | Heraldic' : 'Mise En Abyme (MEA) | Heraldic Virtual Cloud Desktop';
  const description = page === 'home' ? 'Nothing Is Impossible. Discover Heraldic’s mission to develop AGI, advance MEA Cloud Desktops and build PeopleWelcome, a social platform for humans and machines.' : page === 'media' ? 'Explore and download the original GTC 2017 MEA poster and Mise En Abyme Cloud Primary Personal Computers poster from the Heraldic archive.' : 'Discover the historical Mise En Abyme (MEA) virtual cloud desktop concept: cloud gaming, smartphone desktops, IPv6 and original archived graphics.';
  const schema = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Organization', '@id': origin + '/#organization', name: 'Heraldic Clouds Inc.', url: origin + '/', logo: origin + '/HERALDIC2026.png', address: { '@type': 'PostalAddress', streetAddress: '23515 NE Novelty Hill Rd Ste B221 PMB 267', addressLocality: 'Redmond', addressRegion: 'WA', postalCode: '98053', addressCountry: 'US' } },
    { '@type': 'WebSite', '@id': origin + '/#website', name: 'Heraldic', url: origin + '/', publisher: { '@id': origin + '/#organization' } },
    { '@type': 'WebPage', '@id': url + '#webpage', name: title, description, url, isPartOf: { '@id': origin + '/#website' } },
    ...(page !== 'home' ? [{ '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Heraldic', item: origin + '/' }, { '@type': 'ListItem', position: 2, name: page === 'mea' ? 'MEA' : 'Media', item: url }] }] : [])
  ] };
  const metadata = `<link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" /><meta property="og:site_name" content="Heraldic" />
    <meta property="og:title" content="${title}" /><meta property="og:description" content="${description}" />
    <meta property="og:url" content="${url}" /><meta property="og:image" content="${origin}/HERALDIC2026.png" />
    <meta property="og:image:alt" content="Heraldic company logo" /><meta name="twitter:card" content="summary" />
    <script type="application/ld+json">${JSON.stringify(schema).replaceAll('<', '\\u003c')}</script>`;
  const html = template.replace(/<title>.*?<\/title>/, `<title>${title}</title>`).replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${description}" />`).replace('</head>', metadata + '\n</head>').replace('<div id="root"></div>', () => `<div id="root">${render(page)}</div>`);
  const folder = page === 'home' ? 'dist' : `dist/${page}`;
  await mkdir(folder, { recursive: true });
  await writeFile(folder + '/index.html', html);
}
