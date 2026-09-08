export const API_BASE_URL = (() => {
  // 1) Highest priority: explicit env override
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // 2) Anything that is not a production build talks to the local API. `DEV`
  // rather than `MODE === 'development'`: MODE carries a custom value under
  // `vite build --mode staging` or `vitest`, which would silently fall through
  // to the deployed API below.
  //
  // 5002 matches backend/.env — port 5000 is held by the AirPlay Receiver on
  // macOS, so the API cannot use it locally.
  if (import.meta.env.DEV) {
    return 'http://localhost:5002/api/v1';
  }

  // 3) Production fallback: Render API URL. Set VITE_API_BASE_URL on Netlify
  // to point at a different host without touching the code.
  return 'https://electronic-voting-system-nxqt.onrender.com/api/v1';
})();

/**
 * URL of the API health endpoint, derived from the configured base URL so that
 * it follows VITE_API_BASE_URL instead of hardcoding a second copy of the host.
 *
 * @type {string}
 */
export const API_HEALTH_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '/api/health');

// Emitted when a request has been outstanding long enough that the voter
// deserves an explanation, and again once one comes back. The API sleeps on
// Render's free plan and takes upwards of twenty seconds to wake, which
// without this looks exactly like a broken site.
export const API_SLOW_EVENT = 'evspolls:api-slow';
export const API_AWAKE_EVENT = 'evspolls:api-awake';
const SLOW_AFTER_MS = 4000;

const AUTH_KEYS = ['token', 'user', 'sessionExpiry'];

let inflight = 0;
let slowTimer = null;

const startedRequest = () => {
  inflight += 1;
  if (inflight === 1 && typeof window !== 'undefined') {
    slowTimer = setTimeout(() => window.dispatchEvent(new Event(API_SLOW_EVENT)), SLOW_AFTER_MS);
  }
};

const finishedRequest = () => {
  inflight = Math.max(0, inflight - 1);
  if (inflight === 0) {
    clearTimeout(slowTimer);
    slowTimer = null;
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(API_AWAKE_EVENT));
  }
};

// Guarded because this module is imported by the build's prerender step, which
// runs in Node where none of these globals exist.
const readStored = (key) => {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

// axios drops a param only when it is undefined or null — an empty string is
// still sent. Anything stricter changes what the API receives, so the rule is
// copied exactly rather than tightened.
const queryString = (params) => {
  if (!params) return '';
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((v) => v !== undefined && v !== null && search.append(key, v));
    } else {
      search.append(key, value);
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
};

// Shaped like an axios rejection on purpose: call sites across the app read
// `err.response.status` and `err.response.data.message`, and a network failure
// has to arrive with `err.request` set so it reads as "can't reach the server"
// rather than as a bare JavaScript error.
const httpError = (message, { response, request, code } = {}) => {
  const error = new Error(message);
  if (response) error.response = response;
  if (request) error.request = request;
  if (code) error.code = code;
  return error;
};

// Real configuration the client reads on every call, not an axios-compatibility
// shim — `request` below resolves both values through this object.
const defaults = {
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
};

const request = async (method, url, { params, data } = {}) => {
  const headers = {};
  if (data !== undefined) headers['Content-Type'] = defaults.headers['Content-Type'];
  const token = readStored('token');
  if (token) headers.Authorization = `Bearer ${token}`;

  startedRequest();
  let res;
  try {
    res = await fetch(`${defaults.baseURL}${url}${queryString(params)}`, {
      method,
      headers,
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  } catch (cause) {
    finishedRequest();
    throw httpError(cause.message || 'Network request failed', { request: true });
  }
  finishedRequest();

  // A 204, or an error page from something in front of the API, has no JSON to
  // parse; failing to read a body is not itself the failure worth reporting.
  let body = null;
  const text = await res.text().catch(() => '');
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    // Only an actual 401 clears the session. A request that never reached the
    // server cannot tell you anything about whether the token is still good.
    if (res.status === 401) {
      AUTH_KEYS.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    }
    throw httpError(`Request failed with status code ${res.status}`, {
      response: { status: res.status, data: body },
    });
  }

  return { data: body, status: res.status };
};

// The axios surface this app actually uses, and no more. Replacing the library
// with the five verbs it was called with removes ~13 kB gzipped from the
// critical path for a client that was already mostly a wrapper over fetch.
const apiClient = {
  defaults,
  get: (url, config) => request('GET', url, config),
  post: (url, data, config) => request('POST', url, { ...config, data: data ?? {} }),
  put: (url, data, config) => request('PUT', url, { ...config, data: data ?? {} }),
  patch: (url, data, config) => request('PATCH', url, { ...config, data: data ?? {} }),
  delete: (url, config) => request('DELETE', url, config),
};

export default apiClient;
