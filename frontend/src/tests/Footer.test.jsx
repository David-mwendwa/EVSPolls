import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Footer from '../components/Footer';
import { API_HEALTH_URL } from '../api/apiClient';

describe('Footer', () => {
  it('carries the EVSPolls name', () => {
    render(<Footer />);

    expect(screen.getByText('EVSPolls')).toBeInTheDocument();
  });

  it('points the API status link at the configured API host', () => {
    render(<Footer />);

    expect(screen.getByText('API Status')).toHaveAttribute(
      'href',
      API_HEALTH_URL
    );
  });

  it('shows the current year', () => {
    render(<Footer />);

    expect(
      screen.getByText(`© ${new Date().getFullYear()}`)
    ).toBeInTheDocument();
  });

  it('opens external links safely', () => {
    render(<Footer />);

    expect(screen.getByText('GitHub')).toHaveAttribute('rel', 'noreferrer');
  });
});
