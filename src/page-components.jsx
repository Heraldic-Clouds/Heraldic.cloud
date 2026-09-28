import { lazy } from 'react';

export const pageLoaders = {
  home: () => import('./pages/HomePage.jsx'),
  mea: () => import('./pages/MeaPage.jsx'),
  media: () => import('./pages/MediaPage.jsx'),
  heraldic: () => import('./pages/HeraldicPage.jsx'),
  leadership: () => import('./pages/LeadershipPage.jsx'),
};

export const pageComponents = Object.fromEntries(Object.entries(pageLoaders).map(([pageName, loadPage]) => [pageName, lazy(loadPage)]));
