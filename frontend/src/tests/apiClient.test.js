import { describe, it, expect } from 'vitest';
import apiClient, { API_BASE_URL, API_HEALTH_URL } from '../api/apiClient';

describe('API base URL', () => {
  it('targets the local API in development, not the port AirPlay holds', () => {
    expect(API_BASE_URL).toBe('http://localhost:5002/api/v1');
    expect(API_BASE_URL).not.toContain(':5000');
  });

  it('always includes the versioned prefix', () => {
    expect(API_BASE_URL).toMatch(/\/api\/v1$/);
  });
});

describe('API health URL', () => {
  it('is derived from the base URL rather than hardcoded separately', () => {
    const origin = new URL(API_BASE_URL).origin;

    expect(API_HEALTH_URL).toBe(`${origin}/api/health`);
  });
});

describe('apiClient', () => {
  it('is configured with the resolved base URL', () => {
    expect(apiClient.defaults.baseURL).toBe(API_BASE_URL);
  });

  it('sends JSON by default', () => {
    expect(apiClient.defaults.headers['Content-Type']).toBe(
      'application/json'
    );
  });
});
