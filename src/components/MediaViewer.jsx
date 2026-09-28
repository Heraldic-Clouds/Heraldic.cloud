import { useEffect, useRef, useState } from 'react';

export default function MediaViewer({ image, onClose }) {
  const pinchDistanceRef = useRef(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const changeZoom = (amount) => setZoom((value) => Math.min(4, Math.max(.5, value + amount)));
  const startPinch = (event) => {
    if (event.touches.length !== 2) return;
    const [first, second] = event.touches;
    pinchDistanceRef.current = Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
  };
  const movePinch = (event) => {
    if (event.touches.length !== 2 || !pinchDistanceRef.current) return;
    event.preventDefault();
    const [first, second] = event.touches;
    const distance = Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
    const ratio = distance / pinchDistanceRef.current;
    if (Math.abs(ratio - 1) > .025) {
      setZoom((value) => Math.min(4, Math.max(.5, value * ratio)));
      pinchDistanceRef.current = distance;
    }
  };

  return <div className="screen-media-viewer" role="dialog" aria-modal="true" aria-label={image.title}
    onWheel={(event) => { if (event.ctrlKey) { event.preventDefault(); changeZoom(event.deltaY < 0 ? .15 : -.15); } }}
    onTouchStart={startPinch} onTouchMove={movePinch} onTouchEnd={() => { pinchDistanceRef.current = null; }}>
    <div className="screen-media-viewer-panel">
      <div className="media-viewer-controls"><button type="button" onClick={() => changeZoom(-.25)} aria-label="Zoom out">−</button><span>{Math.round(zoom * 100)}%</span><button type="button" onClick={() => changeZoom(.25)} aria-label="Zoom in">+</button><button type="button" onClick={() => setZoom(1)}>Fit</button><button className="media-viewer-close" type="button" onClick={onClose} aria-label="Close image">×</button></div>
      <div className="media-viewer-scroll" tabIndex="0" aria-label="Scrollable image viewer"><img style={{ width: `${zoom * 100}%` }} src={image.src} alt={image.alt} /><p>{image.title}</p></div>
    </div>
  </div>;
}
