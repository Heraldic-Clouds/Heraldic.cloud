import { lazy, Suspense, useState } from 'react';

const MediaViewer = lazy(() => import('../components/MediaViewer.jsx'));
const posters = [
  ['gtc2017-preview.png', 'gtcPosterTitle', 'gtcPosterAlt'],
  ['mea-computers-preview.png', 'meaPosterTitle', 'meaPosterAlt'],
  ['gtc2018-mea-poster-preview.jpg', 'gtc2018PosterTitle', 'gtc2018PosterAlt'],
];
const gallery = [
  ['alter-ego-02.png', 'alterEgoTwoTitle', 'alterEgoTwoAlt'], ['alter-ego-03.png', 'alterEgoThreeTitle', 'alterEgoThreeAlt'], ['alter-ego-04.png', 'alterEgoFourTitle', 'alterEgoFourAlt'], ['alter-ego-06.jpg', 'alterEgoSixTitle', 'alterEgoSixAlt'], ['alter-ego-07.jpg', 'alterEgoSevenTitle', 'alterEgoSevenAlt'],
  ['cnn-nvidia-demo.png', 'cnnNvidiaTitle', 'cnnNvidiaAlt'], ['cnn-game-demo.png', 'cnnGameTitle', 'cnnGameAlt'], ['google-earth-mckinley.png', 'mckinleyTitle', 'mckinleyAlt'], ['google-earth-beaver-mesa.png', 'beaverMesaTitle', 'beaverMesaAlt'], ['benchmark-standard.png', 'benchmarkTitle', 'benchmarkAlt'], ['google-earth-bryce.png', 'bryceTitle', 'bryceAlt'], ['benchmark-extreme.png', 'benchmarkExtremeTitle', 'benchmarkExtremeAlt'], ['google-earth-canyonlands.png', 'canyonlandsTitle', 'canyonlandsAlt'], ['google-earth-glacier.png', 'glacierTitle', 'glacierAlt'], ['google-earth-grand-teton.png', 'grandTetonTitle', 'grandTetonAlt'], ['google-earth-kings-canyon.png', 'kingsCanyonTitle', 'kingsCanyonAlt'], ['google-earth-zion.png', 'zionTitle', 'zionAlt'],
];

export default function MediaPage({ copy }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const openImage = (file, title, alt) => setSelectedImage({ src: `/media/${file}`, title: copy[title], alt: copy[alt] });

  return <section id="media" className="screen-section media-section">
    <p className="eyebrow">{copy.mediaEyebrow}</p><h1>{copy.mediaTitle}</h1><p className="lede">{copy.mediaIntro}</p>
    <h2>{copy.mediaPostersHeading}</h2><div className="media-grid">
      {posters.map(([file, title, alt]) => <article className="media-card" key={file}>
        <button className="poster-preview media-open" type="button" onClick={() => openImage(file, title, alt)} aria-label={`${copy.openImage}: ${copy[title]}`}><img src={`/media/${file}`} alt={copy[alt]} loading="lazy" decoding="async" /></button>
        <h2>{copy[title]}</h2>
      </article>)}
    </div><p className="mea-note">{copy.mediaNote}</p>
    <h2>{copy.mediaGalleryHeading}</h2><p>{copy.mediaGalleryIntro}</p>
    <div className="image-gallery">{gallery.map(([file, title, alt]) => <figure className="gallery-card" key={file}><button className="media-open" type="button" onClick={() => openImage(file, title, alt)} aria-label={`${copy.openImage}: ${copy[title]}`}><img src={`/media/${file}`} alt={copy[alt]} loading="lazy" decoding="async" /></button><figcaption>{copy[title]}</figcaption></figure>)}</div>
    {selectedImage && <Suspense fallback={<div className="media-viewer-loading" role="status">Opening image…</div>}><MediaViewer image={selectedImage} onClose={() => setSelectedImage(null)} /></Suspense>}
  </section>;
}
