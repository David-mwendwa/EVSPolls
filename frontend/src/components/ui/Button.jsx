import { Link } from 'react-router-dom';

/**
 * Button variants. Colour carries meaning here rather than decoration: the
 * admin dashboard previously had a green "New Election" next to a blue "Add
 * Voter" with neither colour meaning anything, in an app whose brand is sky.
 */
const VARIANTS = {
  primary:
    'bg-primary-600 text-white shadow-sm hover:bg-primary-700 active:bg-primary-800 focus-visible:ring-primary-500/40',
  secondary:
    'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 shadow-sm hover:bg-gray-50 hover:text-gray-900 focus-visible:ring-primary-500/40',
  subtle:
    'bg-primary-50 text-primary-700 hover:bg-primary-100 focus-visible:ring-primary-500/40',
  ghost:
    'text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-primary-500/40',
  danger:
    'bg-danger-600 text-white shadow-sm hover:bg-danger-700 focus-visible:ring-danger-500/40',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-sm gap-2',
};

/**
 * Shared button, rendered as a `<button>`, a router `<Link>` or an `<a>`
 * depending on the props given.
 *
 * @param {Object} props
 * @param {keyof VARIANTS} [props.variant] - Visual treatment.
 * @param {keyof SIZES} [props.size] - Padding and text scale.
 * @param {React.ComponentType} [props.icon] - Leading icon.
 * @param {string} [props.to] - Renders a router Link.
 * @param {string} [props.href] - Renders an anchor.
 * @param {boolean} [props.block] - Stretch to the container width.
 * @returns {JSX.Element}
 */
const Button = ({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  to,
  href,
  block = false,
  className = '',
  children,
  ...rest
}) => {
  const classes = [
    'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-4 disabled:opacity-60 disabled:pointer-events-none',
    VARIANTS[variant],
    SIZES[size],
    block ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {Icon && <Icon className='w-4 h-4 flex-shrink-0' aria-hidden='true' />}
      {children}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {content}
      </a>
    );
  }

  return (
    <button type='button' className={classes} {...rest}>
      {content}
    </button>
  );
};

export default Button;
