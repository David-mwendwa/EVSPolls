import request from 'supertest';
import app from '../app.js';

// These exercise the parts of the app that do not touch the database, so the
// suite runs without a Mongo connection.

describe('GET /api/health', () => {
  it('reports that the server is running', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(typeof res.body.uptime).toBe('number');
  });

  it('is not cached', async () => {
    const res = await request(app).get('/api/health');

    expect(res.headers['cache-control']).toBe('no-store');
  });
});

describe('GET /', () => {
  it('identifies the service', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/API is running/i);
  });
});

describe('unknown routes', () => {
  it('returns a JSON 404 rather than HTML', async () => {
    const res = await request(app).get('/api/v1/not-a-real-route');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: 'Route not found' });
  });
});

describe('security headers', () => {
  it('allows the API to be read from the separately-hosted frontend', async () => {
    const res = await request(app).get('/api/health');

    // `same-site` here would have browsers reject responses on the Netlify
    // frontend, which is a different site from the Render API.
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });

  it('sets a restrictive content security policy', async () => {
    const res = await request(app).get('/api/health');

    expect(res.headers['content-security-policy']).toContain(
      "default-src 'none'"
    );
  });
});

describe('CORS', () => {
  it('accepts requests from the deployed frontend', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://evspolls.netlify.app');

    expect(res.headers['access-control-allow-origin']).toBe(
      'https://evspolls.netlify.app'
    );
  });

  it('does not echo an unknown origin back', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://not-our-frontend.example');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('protected routes', () => {
  it('rejects an unauthenticated request for the user list', async () => {
    const res = await request(app).get('/api/v1/users');

    expect(res.status).toBe(401);
  });

  it('rejects a request carrying a malformed token', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(res.status).toBe(401);
  });
});
