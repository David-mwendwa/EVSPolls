// One source of truth for the strings that appear in <head>, in the prerendered
// pages, in the sitemap and on the social card.
export const site = {
  name: 'EVSPolls',
  url: 'https://evspolls.netlify.app',
  tagline: 'Secure Online Elections',
  description:
    'EVSPolls runs secure, transparent elections for student councils, faculty senates and alumni boards — verifiable ballots, live results, and one vote per voter.',
  shortDescription: 'Secure online elections for institutions.',
  author: 'David Mwendwa',
  repo: 'https://github.com/David-mwendwa/EVSPolls',
  locale: 'en_US',
};

// The routes the build prerenders to their own directory (see
// scripts/prerender-meta.mjs, which imports this list). It lives here rather
// than only in the build script because the running app needs it too: Netlify
// serves how-it-works/index.html and 301s the un-slashed /how-it-works, so the
// canonical for a prerendered route has to carry the trailing slash.
//
// A direct hit gets the redirect and `location.pathname` already ends in a
// slash, which hides the problem. Client-side navigation does not redirect, so
// a visitor arriving via a nav link would otherwise be handed a canonical
// naming a URL that 301s — a weaker signal than it looks, and invisible in
// testing.
export const PRERENDERED_PATHS = ['/', '/how-it-works', '/404'];

const normalise = (pathname) =>
  pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

/** Absolute canonical URL for a pathname, trailing slash included where Netlify requires one. */
export const canonicalUrl = (pathname) => {
  const path = normalise(pathname);
  const slashed = PRERENDERED_PATHS.includes(path) && path !== '/' ? `${path}/` : path;
  return `${site.url}${slashed}`;
};

export default site;
