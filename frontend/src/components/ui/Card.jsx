/**
 * Surface container used across the app.
 *
 * Cards were previously spelled with slightly different radii, borders and
 * shadows on every page; this fixes one treatment so surfaces read as a set.
 *
 * @param {Object} props
 * @param {boolean} [props.interactive] - Adds hover affordance for cards that
 *   are themselves links or buttons.
 * @param {boolean} [props.padded] - Applies the standard inner padding.
 * @param {keyof typeof ACCENTS} [props.accent] - Optional left edge highlight.
 * @returns {JSX.Element}
 */
const ACCENTS = {
  none: '',
  primary: 'border-l-4 border-l-primary-500',
  success: 'border-l-4 border-l-success-500',
  warning: 'border-l-4 border-l-warning-500',
  danger: 'border-l-4 border-l-danger-500',
};

const Card = ({
  interactive = false,
  padded = true,
  accent = 'none',
  className = '',
  children,
  ...rest
}) => (
  <div
    className={[
      'bg-white rounded-xl ring-1 ring-gray-200/80 shadow-sm',
      padded ? 'p-5' : '',
      ACCENTS[accent],
      interactive
        ? 'transition-shadow transition-colors hover:shadow-md hover:ring-gray-300'
        : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
    {...rest}>
    {children}
  </div>
);

/**
 * Card heading row with an optional action on the right.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.title - Section heading.
 * @param {React.ReactNode} [props.description] - Supporting line.
 * @param {React.ReactNode} [props.action] - Trailing control.
 * @returns {JSX.Element}
 */
export const CardHeader = ({ title, description, action }) => (
  <div className='flex items-start justify-between gap-4 mb-4'>
    <div className='min-w-0'>
      <h3 className='text-sm font-semibold text-gray-900 mb-0'>{title}</h3>
      {description && (
        <p className='mt-0.5 text-xs text-gray-500 mb-0'>{description}</p>
      )}
    </div>
    {action}
  </div>
);

export default Card;
