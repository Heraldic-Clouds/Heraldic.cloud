export const pageMetadata = {
  home: { path: '/', title: 'Heraldic | Humane AI, Business Agents & AI Governance', description: 'Heraldic is pursuing humane AI and AI governance, and helps businesses build AI agents for automation alongside cloud computing and privacy-respecting technology.' },
  mea: { path: '/mea/', title: 'Mise En Abyme (MEA) | Heraldic Cloud Desktop', description: 'Explore Mise En Abyme cloud desktop services for cloud computing, gaming, work, learning and access.' },
  media: { path: '/media/', title: 'Heraldic Media | MEA Posters & Cloud Desktop Archive', description: 'View Heraldic’s NVIDIA GTC conference posters and cloud desktop, graphics benchmark, and 3D mapping screenshots.' },
  heraldic: { path: '/heraldic/', title: 'Heraldic History | From Cloud Computing to AI', description: 'Explore Heraldic’s history from the 2013 Mise En Abyme cloud desktop idea and early prototypes through NVIDIA GTC research and the company’s transition to AI.' },
  leadership: { path: '/leadership/', title: 'Leadership | Heraldic', description: 'Artem D. is Heraldic’s founder, a computer science graduate, two-time NVIDIA GTC research poster presenter, and CompTIA cloud technology subject matter expert.' },
};

export function resolvePagePath(pathname) {
  const normalizePath = (path) => path.replace(/\/+$/, '') || '/';
  const normalizedPath = normalizePath(pathname);
  return Object.entries(pageMetadata).find(([, metadata]) => normalizePath(metadata.path) === normalizedPath)?.[0] || null;
}
