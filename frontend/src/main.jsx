import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import { preloadRoute } from './routes.jsx';

const container = document.getElementById('root');
const tree = (
  <React.StrictMode>
    <App router={BrowserRouter} />
  </React.StrictMode>
);

// Netlify answers a path it has no file for with the SPA fallback, which is
// index.html — the prerendered *landing page*, markup and all. So a non-empty
// root is not on its own permission to hydrate: on /results/abc it holds the
// home page, and adopting it would make React reconcile a results screen
// against the landing page, discard the document and log error #418 for every
// visitor on every route the build did not prerender.
//
// The build stamps each prerendered file with the route it was rendered for,
// and only a match is adopted. Everything else mounts fresh, which is what
// used to happen for all twelve routes anyway.
const normalise = (p) => (p.length > 1 ? p.replace(/\/+$/, '') : p);
const prerenderedFor = container.dataset.prerendered;
const canHydrate =
  container.hasChildNodes() &&
  prerenderedFor &&
  normalise(prerenderedFor) === normalise(window.location.pathname);

// The preload is not optional. Routes are lazy now, and a lazy component
// suspends on its first render; hydrating against server HTML while suspended
// makes React discard the markup it was handed, which shows up as the page
// appearing and then blanking. Waiting for the one chunk this URL needs costs
// a few milliseconds and keeps the paint.
if (canHydrate) {
  preloadRoute(window.location.pathname).then(() => hydrateRoot(container, tree));
} else {
  createRoot(container).render(tree);
}
