import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './App.jsx';
export const render = page => renderToString(<App page={page} />);
