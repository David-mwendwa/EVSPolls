import { lazy } from 'react';

// Every page is loaded on demand. The admin console and the reporting views
// were already lazy; the voter-facing pages were not, so a visitor landing on
// the home page also downloaded the ballot screen, the profile screen and the
// elections list before anything appeared.
//
// `route()` wraps React.lazy with a preload hook. The wrapper matters for the
// prerendered pages: hydration has to find the same markup the build wrote,
// and a bare React.lazy component renders its Suspense fallback on the first
// pass — which does not match, so React discards the server HTML and the page
// blanks before it repaints. main.jsx preloads the current route's chunk and
// only then hydrates; once the module is in `loaded`, the wrapper renders it
// synchronously and the first paint survives.
const loaded = new Map();

const route = (key, factory) => {
  const Lazy = lazy(factory);
  const Component = (props) => {
    const Ready = loaded.get(key);
    return Ready ? <Ready {...props} /> : <Lazy {...props} />;
  };
  Component.preload = () =>
    factory().then((mod) => {
      loaded.set(key, mod.default);
      return mod;
    });
  return Component;
};

export const Home = route('home', () => import('./pages/Home.jsx'));
export const HowItWorks = route('how-it-works', () => import('./pages/HowItWorks.jsx'));
export const Elections = route('elections', () => import('./pages/Elections.jsx'));
export const Vote = route('vote', () => import('./pages/Vote.jsx'));
export const Profile = route('profile', () => import('./pages/Profile.jsx'));
export const Admin = route('admin', () => import('./pages/Admin.jsx'));
export const CreateElection = route('create', () => import('./pages/CreateElection.jsx'));
export const ElectionDetails = route('election-details', () => import('./pages/ElectionDetails.jsx'));
export const Results = route('results', () => import('./pages/Results.jsx'));

// Only the routes the build prerenders need preloading — they are the only
// ones whose first paint comes from HTML rather than from React. Everything
// else mounts into an empty root, where a Suspense fallback is correct.
const PRELOADERS = {
  '/': Home,
  '/how-it-works': HowItWorks,
};

export const preloadRoute = (pathname) => {
  const key = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const match = PRELOADERS[key];
  // The 404 page is defined inline in App.jsx and ships with the entry chunk,
  // so there is nothing to fetch for an unknown path.
  return match ? match.preload().catch(() => {}) : Promise.resolve();
};
