// Shared by the prerender step and the build verifier, so the two cannot
// disagree about what any given page is supposed to say.
import { PRERENDERED_PATHS } from '../src/data/site.js';

export const SITE_URL = 'https://evspolls.netlify.app';
export const SITE_NAME = 'EVSPolls';
export const SITE_TAGLINE = 'Secure Online Elections';
export const SITE_DESCRIPTION =
  'EVSPolls runs secure, transparent elections for student councils, faculty senates and alumni boards — verifiable ballots, live results, and one vote per voter.';

export const NOT_FOUND_PATH = '/404';

// The public surface of a voting platform is small on purpose. Everything else
// — the elections list, a ballot, a results page, a voter profile, the admin
// console — is either behind a session or specific to one institution's
// election, and none of it belongs in a search index. Those routes would also
// prerender as an empty shell, since they render nothing without data.
export const ROUTES = [
  {
    path: '/',
    title: null,
    description: SITE_DESCRIPTION,
    changefreq: 'weekly',
    priority: '1.0',
  },
  {
    path: '/how-it-works',
    title: 'How it works',
    description:
      'How an EVSPolls election runs end to end: voter roll, ballot, one vote per voter, and results published the moment polls close.',
    changefreq: 'monthly',
    priority: '0.8',
  },
  {
    path: NOT_FOUND_PATH,
    title: 'Page not found',
    description: 'That page does not exist on EVSPolls.',
    noindex: true,
  },
];

export const PRERENDER_PATHS = ROUTES.map((r) => r.path);

// Two lists of the same thing is one list too many, but ROUTES also carries
// titles and descriptions that the app has no use for. Keeping them separate
// and asserting they agree costs nothing and catches the drift.
if (
  PRERENDERED_PATHS.length !== PRERENDER_PATHS.length ||
  PRERENDER_PATHS.some((p) => !PRERENDERED_PATHS.includes(p))
) {
  throw new Error(
    `prerender-meta: ROUTES (${PRERENDER_PATHS.join(', ')}) disagrees with ` +
      `PRERENDERED_PATHS in src/data/site.js (${PRERENDERED_PATHS.join(', ')})`
  );
}

export const metaForPath = (path) => ROUTES.find((r) => r.path === path);

export const titleFor = (route) =>
  route.title ? `${route.title} | ${SITE_NAME}` : `${SITE_NAME} | ${SITE_TAGLINE}`;

// Netlify redirects /how-it-works to /how-it-works/ when it is serving
// how-it-works/index.html, so the un-slashed form is a 301, not a page. A
// canonical, an og:url and a sitemap entry all have to name the URL that
// answers with a 200 — pointing them at a redirect makes every one of them a
// weaker signal than it looks.
//
// Delegated to the app's own canonicalUrl so the HTML the build writes and the
// HTML the running app rewrites cannot disagree about the same page.
export { canonicalUrl as canonicalFor } from '../src/data/site.js';

// Everything a crawler should stay out of. This is most of the app: ballots,
// results, voter profiles and the administration console.
export const DISALLOW = [
  '/admin',
  '/create',
  '/elections',
  '/profile',
  '/vote/',
  '/results/',
  '/maintenance',
  '/404',
];
