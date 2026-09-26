import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './personalization.css';

const root = document.getElementById('root');
const app = (
  <StrictMode>
    <App page={location.pathname.startsWith('/media/') ? 'media' : location.pathname.startsWith('/mea/') ? 'mea' : 'home'} />
  </StrictMode>
);
if (root.hasChildNodes()) hydrateRoot(root, app); else createRoot(root).render(app);
