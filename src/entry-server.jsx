import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './App.jsx';
import HomePage from './pages/HomePage.jsx';
import MeaPage from './pages/MeaPage.jsx';
import Stratus2Page from './pages/Stratus2Page.jsx';
import MediaPage from './pages/MediaPage.jsx';
import HeraldicPage from './pages/HeraldicPage.jsx';
import LeadershipPage from './pages/LeadershipPage.jsx';

const pageComponents = { home: HomePage, mea: MeaPage, stratus2: Stratus2Page, media: MediaPage, heraldic: HeraldicPage, leadership: LeadershipPage };
export const render = (page) => renderToString(<App page={page} PageContent={pageComponents[page]} />);
