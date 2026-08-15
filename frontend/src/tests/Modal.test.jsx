import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from '../components/ui/Modal';

const renderModal = (props = {}) =>
  render(
    <Modal open onClose={() => {}} title='Sign in' {...props}>
      <input aria-label='Email' />
      <button type='button'>Inner action</button>
    </Modal>
  );

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(
      <Modal open={false} onClose={() => {}} title='Sign in'>
        <p>Body</p>
      </Modal>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('exposes itself as a labelled modal dialog', () => {
    renderModal();

    const dialog = screen.getByRole('dialog');

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Sign in');
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });

  it('closes when the backdrop is clicked', async () => {
    const onClose = vi.fn();
    const { container } = renderModal({ onClose });

    const backdrop = container.ownerDocument.querySelector(
      '[aria-hidden="true"]'
    );
    await userEvent.click(backdrop);

    expect(onClose).toHaveBeenCalled();
  });

  it('does not close when the panel itself is clicked', async () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    await userEvent.click(screen.getByText('Inner action'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes from the close button', async () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    await userEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it('locks scrolling on the page behind it', () => {
    const { unmount } = renderModal();

    expect(document.body.style.overflow).toBe('hidden');

    unmount();

    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('renders a footer when one is given', () => {
    renderModal({ footer: <span>Footer content</span> });

    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });
});
