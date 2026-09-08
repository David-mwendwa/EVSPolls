/**
 * Fails the build on the mistakes that are invisible until they are in
 * production. Every check here stands for something that actually went wrong
 * or nearly did — a prerendered page whose root came out empty, a canonical
 * naming a URL that 301s, an og:image that unfurlers cannot fetch, a Google
 * Fonts URL creeping back into the compiled CSS and quietly restoring the
 * render-blocking round trips this work removed.
 *
 * Runs against dist/ after the prerender step, so it checks the bytes that
 * ship rather than the source that produced them.
 */
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { PRERENDER_PATHS, canonicalFor, metaForPath, titleFor } from './prerender-meta.mjs';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const failures = [];
const fail = (msg) => failures.push(msg);

const pageFile = (path) => (path === '/' ? join(dist, 'index.html') : join(dist, path, 'index.html'));
const titles = new Map();

for (const path of PRERENDER_PATHS) {
  const file = pageFile(path);
  if (!existsSync(file)) {
    fail(`${path}: not prerendered (${file} missing)`);
    continue;
  }
  const html = readFileSync(file, 'utf8');
  const route = metaForPath(path);

  // Greedy on purpose. A non-greedy match stops at the first nested </div>,
  // which reports every page as empty and hides the failure it exists to find.
  // The attribute wildcard matters too: the root carries data-prerendered, and
  // a pattern expecting a bare <div id="root"> matches nothing at all.
  const root = html.match(/<div id="root"[^>]*>([\s\S]*)<\/div>/);
  const markup = root ? root[1] : '';
  if (markup.length < 500) {
    fail(`${path}: prerendered root is ${markup.length} chars — the page rendered empty`);
  }

  // main.jsx will not adopt the markup without this, and a wrong value is
  // worse than a missing one — it adopts the wrong page.
  const stamp = html.match(/<div id="root" data-prerendered="([^"]*)"/)?.[1];
  if (stamp !== path) {
    fail(`${path}: data-prerendered is ${JSON.stringify(stamp)}, expected ${JSON.stringify(path)}`);
  }

  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
  if (title !== titleFor(route)) fail(`${path}: title is "${title}", expected "${titleFor(route)}"`);
  if (titles.has(title)) fail(`${path}: shares its title with ${titles.get(title)}`);
  titles.set(title, path);

  const canonical = html.match(/rel="canonical" href="([^"]*)"/)?.[1];
  if (canonical !== canonicalFor(path)) {
    fail(`${path}: canonical is ${canonical}, expected ${canonicalFor(path)}`);
  }

  const desc = html.match(/<meta\s+name="description"\s+content="([^"]*)"/)?.[1] ?? '';
  // A noindex page is allowed a short description; nothing will display it.
  if (!route.noindex && desc.length < 50) {
    fail(`${path}: description is ${desc.length} chars — too short to be useful`);
  }

  // The old value was "/logo.svg": relative, which unfurlers cannot resolve,
  // and SVG, which almost none of them render. Both halves are checked.
  const ogImage = html.match(/property="og:image"\s+content="([^"]*)"/)?.[1] ?? '';
  if (!ogImage.startsWith('http')) {
    fail(`${path}: og:image is "${ogImage}" — unfurlers need an absolute URL`);
  }
  if (/\.svg($|\?)/i.test(ogImage)) {
    fail(`${path}: og:image is an SVG — unfurlers do not render them`);
  }

  if (route.noindex && !/name="robots"\s+content="noindex/.test(html)) {
    fail(`${path}: expected a robots noindex tag`);
  }
  if (!html.includes('/fonts/fonts.css')) fail(`${path}: self-hosted font stylesheet not linked`);
  if (!html.includes('rel="preload" href="/fonts/Montserrat.woff2"')) {
    fail(`${path}: Montserrat is not preloaded — first paint waits on it`);
  }
  if (/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(html)) {
    fail(`${path}: still references Google Fonts`);
  }
}

// The @import lived in index.css, so the compiled stylesheet is where a
// reintroduced one would hide.
for (const f of readdirSync(join(dist, 'assets')).filter((n) => n.endsWith('.css'))) {
  if (/fonts\.googleapis\.com/.test(readFileSync(join(dist, 'assets', f), 'utf8'))) {
    fail(`assets/${f}: compiled CSS references Google Fonts`);
  }
}

for (const f of ['sitemap.xml', 'robots.txt', 'og.jpg']) {
  if (!existsSync(join(dist, f))) fail(`${f}: missing from the build`);
}

if (existsSync(join(dist, 'og.jpg'))) {
  const bytes = statSync(join(dist, 'og.jpg')).size;
  if (bytes > 800_000) fail(`og.jpg is ${Math.round(bytes / 1024)}KB — too heavy for an unfurl`);
}

if (existsSync(join(dist, 'robots.txt'))) {
  const txt = readFileSync(join(dist, 'robots.txt'), 'utf8');
  // A voting platform's ballots and results must never be crawlable.
  for (const p of ['/vote/', '/results/', '/admin']) {
    if (!txt.includes(`Disallow: ${p}`)) fail(`robots.txt: missing Disallow for ${p}`);
  }
}

if (existsSync(join(dist, 'sitemap.xml'))) {
  const xml = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
  for (const path of PRERENDER_PATHS) {
    if (metaForPath(path).noindex) continue;
    if (!xml.includes(canonicalFor(path))) fail(`sitemap.xml: missing ${canonicalFor(path)}`);
  }
  // A private route reaching the sitemap would be actively inviting a crawl.
  for (const p of ['/vote/', '/results/', '/admin', '/profile']) {
    if (xml.includes(p)) fail(`sitemap.xml: lists a private route (${p})`);
  }
}

// Nothing on the critical path should approach the size of the old single
// bundle. zxcvbn is exempt and only that: it is fetched when someone types
// into the registration password field, never on load. See Register.jsx.
const LIMIT = 140 * 1024;
const entryHtml = readFileSync(join(dist, 'index.html'), 'utf8');
const critical = [...entryHtml.matchAll(/(?:src|href)="\/assets\/([^"]+)"/g)].map((m) => m[1]);
let criticalBytes = 0;
for (const f of critical) {
  const gz = gzipSync(readFileSync(join(dist, 'assets', f))).length;
  criticalBytes += gz;
  if (gz > LIMIT) fail(`assets/${f}: ${Math.round(gz / 1024)}KB gz exceeds the ${LIMIT / 1024}KB chunk budget`);
}
const CRITICAL_LIMIT = 120 * 1024;
if (criticalBytes > CRITICAL_LIMIT) {
  fail(`critical path is ${Math.round(criticalBytes / 1024)}KB gz, over the ${CRITICAL_LIMIT / 1024}KB budget`);
}

if (failures.length) {
  console.error('\nBuild verification failed:\n');
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error('');
  process.exit(1);
}

console.log(
  `  verified ${PRERENDER_PATHS.length} prerendered routes, sitemap, robots, og.jpg, and a ${Math.round(criticalBytes / 1024)}KB gz critical path`
);
