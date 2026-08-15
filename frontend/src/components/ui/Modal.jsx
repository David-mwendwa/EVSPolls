import { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible dialog shell used by the auth modals.
 *
 * Renders through a portal so the dialog is never trapped inside a parent's
 * stacking or overflow context, and handles the behaviour a dialog is expected
 * to have: Escape and backdrop clicks close it, focus moves into the panel on
 * open and returns to the trigger on close, Tab cycles within the panel, and
 * the page behind it stops scrolling.
 *
 * The header and footer stay put while the body scrolls, so a tall form still
 * shows its title and primary action on a short screen.
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether the dialog is visible.
 * @param {() => void} props.onClose - Called on Escape, backdrop click or the
 *   close button.
 * @param {React.ReactNode} props.title - Dialog heading.
 * @param {React.ReactNode} [props.subtitle] - Supporting line under the title.
 * @param {React.ReactNode} [props.icon] - Brand mark shown beside the title.
 * @param {React.ReactNode} [props.footer] - Pinned content below the body.
 * @param {React.ReactNode} props.children - Dialog body.
 * @param {'sm'|'md'|'lg'} [props.size] - Panel width.
 * @returns {React.ReactPortal|null}
 */
const Modal = ({
  open,
  onClose,
  title,
  subtitle,
  icon,
  footer,
  children,
  size = 'md',
}) => {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);
  const titleId = useId();

  const widths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      // Keep Tab inside the dialog: the page behind it is inert while open.
      const focusable = Array.from(
        panelRef.current.querySelectorAll(FOCUSABLE)
      ).filter((el) => el.offsetParent !== null);

      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    // Let the panel mount before reaching for something to focus.
    const timer = window.setTimeout(() => {
      const target = panelRef.current?.querySelector(
        'input:not([disabled]), button:not([disabled])'
      );
      target?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = overflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  // Entry is animated with the keyframes already defined in tailwind.config.js
  // rather than an animation library: pulling framer-motion in for this added
  // ~114 kB to the entry bundle, which is more than the whole dialog is worth.
  return createPortal(
    <div
      className='fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-6'
      onKeyDown={handleKeyDown}>
      <div
        className='absolute inset-0 bg-gray-900/50 backdrop-blur-sm animate-fade-in'
        onClick={onClose}
        aria-hidden='true'
      />

      <div
        ref={panelRef}
        role='dialog'
        aria-modal='true'
        aria-labelledby={titleId}
        className={`relative w-full ${widths[size]} bg-white shadow-2xl rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-slide-up`}>
        {/* Header */}
        <div className='flex items-start gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-gray-100'>
          {icon && <div className='flex-shrink-0 mt-0.5'>{icon}</div>}
          <div className='flex-1 min-w-0'>
            <h2
              id={titleId}
              className='text-base sm:text-lg font-semibold text-gray-900 leading-tight mb-0'>
              {title}
            </h2>
            {subtitle && (
              <p className='mt-1 text-xs text-gray-500 leading-snug mb-0'>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type='button'
            onClick={onClose}
            aria-label='Close dialog'
            className='flex-shrink-0 -mr-1 -mt-1 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-primary-500 transition-colors'>
            <FiX className='h-5 w-5' />
          </button>
        </div>

        {/* Body */}
        <div className='flex-1 overflow-y-auto px-5 sm:px-6 py-5'>
          {children}
        </div>

        {footer && (
          <div className='px-5 sm:px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl'>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
