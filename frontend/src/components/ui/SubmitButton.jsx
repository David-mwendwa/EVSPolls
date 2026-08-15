/**
 * Full-width primary submit button with a busy state.
 *
 * Both auth forms previously carried their own copy of this markup, including
 * an inline spinner SVG. `aria-busy` is set while pending so the state is not
 * conveyed by the spinner alone.
 *
 * @param {Object} props
 * @param {boolean} [props.pending] - Shows the spinner and blocks submission.
 * @param {boolean} [props.disabled] - Blocks submission.
 * @param {string} [props.pendingLabel] - Label shown while pending.
 * @param {React.ReactNode} props.children - Label shown at rest.
 * @returns {JSX.Element}
 */
const SubmitButton = ({
  pending = false,
  disabled = false,
  pendingLabel = 'Working…',
  children,
}) => {
  const isBlocked = pending || disabled;

  return (
    <button
      type='submit'
      disabled={isBlocked}
      aria-busy={pending}
      className={`w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white shadow-sm transition-colors focus-visible:ring-4 focus-visible:ring-primary-500/30 ${
        isBlocked
          ? 'bg-primary-300 cursor-not-allowed'
          : 'bg-primary-600 hover:bg-primary-700 active:bg-primary-800'
      }`}>
      {pending && (
        <svg
          className='w-4 h-4 animate-spin'
          viewBox='0 0 24 24'
          fill='none'
          aria-hidden='true'>
          <circle
            className='opacity-25'
            cx='12'
            cy='12'
            r='10'
            stroke='currentColor'
            strokeWidth='4'
          />
          <path
            className='opacity-75'
            fill='currentColor'
            d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z'
          />
        </svg>
      )}
      {pending ? pendingLabel : children}
    </button>
  );
};

export default SubmitButton;
