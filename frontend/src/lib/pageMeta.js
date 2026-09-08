import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import site, { canonicalUrl } from '../data/site.js';

// Patches the tags index.html ships with, rather than adding a second set.
// Duplicate og:title tags are worse than none — a crawler picks one, and not
// necessarily the one describing the page.
const setMeta = (selector, value) => {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute('content', value);
};

const setLink = (rel, href) => {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
};

/**
 * Sets the per-route title, description and social tags.
 *
 * `noindex` is the common case in this app rather than the exception. EVSPolls
 * is a voting platform: ballots, results, voter profiles and the admin console
 * are all either private or specific to one institution's election, and none of
 * them belong in a search index. netlify.toml enforces the same thing with an
 * X-Robots-Tag header, which is what covers a crawler that never runs this
 * JavaScript; this is the in-app half.
 */
const usePageMeta = (title, description, { noindex = false } = {}) => {
  const { pathname } = useLocation();

  useEffect(() => {
    const fullTitle = title ? `${title} | ${site.name}` : `${site.name} | ${site.tagline}`;
    const desc = description || site.description;
    // Query strings produce endless near-duplicate URLs of the same page; the
    // canonical names the page, not the way the visitor arrived at it. The
    // trailing-slash rule lives in canonicalUrl, because it differs between
    // prerendered routes (which Netlify serves as a directory and redirects to)
    // and everything else.
    const url = canonicalUrl(pathname);

    document.title = fullTitle;
    setMeta('meta[name="description"]', desc);
    setMeta('meta[property="og:title"]', fullTitle);
    setMeta('meta[property="og:description"]', desc);
    setMeta('meta[property="og:url"]', url);
    setMeta('meta[name="twitter:title"]', fullTitle);
    setMeta('meta[name="twitter:description"]', desc);
    setLink('canonical', url);

    let robots = document.head.querySelector('meta[name="robots"]');
    if (noindex) {
      if (!robots) {
        robots = document.createElement('meta');
        robots.setAttribute('name', 'robots');
        document.head.appendChild(robots);
      }
      robots.setAttribute('content', 'noindex, follow');
    } else if (robots) {
      robots.remove();
    }
  }, [title, description, noindex, pathname]);
};

export default usePageMeta;
