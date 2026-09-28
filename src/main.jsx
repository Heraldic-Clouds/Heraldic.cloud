import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App.jsx';
import { pageComponents, pageLoaders } from './page-components.jsx';
import { resolvePagePath } from './page-routes.mjs';
import './styles.css';
import './personalization.css';

const page = resolvePagePath(location.pathname) || 'home';
const PageContent = pageComponents[page];
const app = <StrictMode><App page={page} PageContent={PageContent} routePageComponents={pageComponents} routePageLoaders={pageLoaders} /></StrictMode>;
const root = document.getElementById('root');
if (root.hasChildNodes()) hydrateRoot(root, app); else createRoot(root).render(app);
