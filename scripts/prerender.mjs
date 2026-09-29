import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { render } from '../.prerender/entry-server.js';
import { SITE_ORIGIN, pageMetadata, pageSchema } from '../src/page-routes.mjs';

const template = await readFile('dist/index.html', 'utf8');
const origin = SITE_ORIGIN;

for (const [page, details] of Object.entries(pageMetadata)) {
  const url = origin + details.path;
  const schema = pageSchema(page);
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
