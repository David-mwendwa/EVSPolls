import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The API is on a different origin to the site, so the browser cannot start
// talking to it until it has done a DNS lookup and a TLS handshake it only
// discovers it needs once the JavaScript runs. Announcing the origin in the
// HTML lets both happen in parallel with the bundle download — which matters
// more here than most places, because the API is on a free plan that can take
// twenty seconds to answer the first request.
//
// Derived from the env rather than written down, so it cannot point at last
// month's backend, and skipped for localhost where preconnecting to yourself
// buys nothing.
const apiPreconnect = (apiUrl) => ({
  name: 'api-preconnect',
  transformIndexHtml(html) {
    const target =
      apiUrl || 'https://electronic-voting-system-nxqt.onrender.com/api/v1';
    let origin;
    try {
      origin = new URL(target).origin;
    } catch {
      return html;
    }
    if (/localhost|127\.0\.0\.1/.test(origin)) return html;
    return html.replace(
      '</head>',
      `  <link rel="preconnect" href="${origin}" crossorigin />\n    <link rel="dns-prefetch" href="${origin}" />\n  </head>`
    );
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), apiPreconnect(env.VITE_API_BASE_URL)],
    server: {
      port: 3000,
      open: true,
    },
    build: {
      rollupOptions: {
        output: {
          // React and the router change only when they are upgraded, while app
          // code changes every deploy. Splitting them means a returning voter
          // re-downloads what actually changed rather than the whole bundle.
          manualChunks: (id) =>
            /node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//.test(id)
              ? 'react'
              : undefined,
        },
      },
      // zxcvbn is the one thing above this, and deliberately so — see the note
      // in components/auth/Register.jsx. It is fetched only when someone types
      // into the password field of the registration form, never on page load.
      chunkSizeWarningLimit: 900,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/tests/setup.js',
      // Only the unit tests. tests/ holds standalone Node scripts that drive a
      // real browser against a real build (`npm run test:prerender`); Vitest
      // picking them up runs them with no build present and reports a failure
      // that is purely about how they were invoked.
      include: ['src/**/*.test.{js,jsx}'],
    },
  };
});
