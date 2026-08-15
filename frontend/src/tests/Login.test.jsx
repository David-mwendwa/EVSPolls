import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from '../components/auth/Login';

const login = vi.fn();
const setRememberMe = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login, rememberMe: false, setRememberMe }),
}));

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const renderLogin = (props = {}) =>
  render(
    <MemoryRouter>
      <Login open onClose={() => {}} onSwitchToRegister={() => {}} {...props} />
    </MemoryRouter>
  );

describe('Login modal', () => {
  beforeEach(() => {
    login.mockReset();
  });

  it('shows the sign-in form', () => {
    renderLogin();

    expect(screen.getByRole('dialog')).toHaveAccessibleName(/sign in/i);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
  });

  it('helps password managers by labelling the fields', () => {
    renderLogin();

    expect(screen.getByLabelText(/email address/i)).toHaveAttribute(
      'autocomplete',
      'email'
    );
    expect(screen.getByLabelText(/^password/i)).toHaveAttribute(
      'autocomplete',
      'current-password'
    );
  });

  it('keeps submission disabled until the form is usable', async () => {
    renderLogin();

    const submit = screen.getByRole('button', { name: /^sign in$/i });
    expect(submit).toBeDisabled();

    await userEvent.type(
      screen.getByLabelText(/email address/i),
      'voter.user@evs.ke'
    );
    await userEvent.type(screen.getByLabelText(/^password/i), 'voter123');

    expect(submit).toBeEnabled();
  });

  it('reports an invalid email once the field is left', async () => {
    renderLogin();

    await userEvent.type(screen.getByLabelText(/email address/i), 'not-email');
    await userEvent.tab();

    expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
  });

  it('hides the demo accounts until they are asked for', async () => {
    renderLogin();

    expect(screen.queryByText(/voter\.user@evs\.ke/)).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: /try a demo account/i })
    );

    expect(screen.getByText(/voter\.user@evs\.ke/)).toBeInTheDocument();
  });

  it('fills the form from a demo account', async () => {
    renderLogin();

    await userEvent.click(
      screen.getByRole('button', { name: /try a demo account/i })
    );
    await userEvent.click(screen.getByRole('button', { name: /^Voter/ }));

    expect(screen.getByLabelText(/email address/i)).toHaveValue(
      'voter.user@evs.ke'
    );
    expect(screen.getByLabelText(/^password/i)).toHaveValue('voter123');
  });

  it('advertises the demo voter address that actually exists', async () => {
    renderLogin();

    await userEvent.click(
      screen.getByRole('button', { name: /try a demo account/i })
    );

    // `voter@evs.ke` cannot be created: the User schema derives a unique id
    // from the email prefix and `voter` is already taken.
    expect(screen.queryByText(/[^.]voter@evs\.ke/)).not.toBeInTheDocument();
  });

  it('surfaces the API message when sign in fails', async () => {
    login.mockRejectedValue({
      response: { data: { message: 'incorrect email or password' } },
    });
    renderLogin();

    await userEvent.type(
      screen.getByLabelText(/email address/i),
      'voter.user@evs.ke'
    );
    await userEvent.type(screen.getByLabelText(/^password/i), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /incorrect email or password/i
    );
  });

  it('signs in with the entered credentials', async () => {
    login.mockResolvedValue({ user: { role: 'user' } });
    const onClose = vi.fn();
    renderLogin({ onClose });

    await userEvent.type(
      screen.getByLabelText(/email address/i),
      'voter.user@evs.ke'
    );
    await userEvent.type(screen.getByLabelText(/^password/i), 'voter123');
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());

    expect(login).toHaveBeenCalledWith(
      { email: 'voter.user@evs.ke', password: 'voter123' },
      false
    );
  });
});
