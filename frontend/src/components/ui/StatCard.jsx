/**
 * Single metric tile.
 *
 * The value is the largest thing in the tile and sits on its own line. The
 * previous dashboard put the number and its caption inline at mismatched
 * sizes ("0  No drafts at the moment"), which wrapped awkwardly and made the
 * figure hard to scan.
 *
 * @param {Object} props
 * @param {string} props.label - What is being measured.
 * @param {React.ReactNode} props.value - The figure itself.
 * @param {string} [props.caption] - Supporting detail under the value.
 * @param {React.ComponentType} [props.icon] - Illustrative icon.
 * @param {keyof typeof TONES} [props.tone] - Accent colour.
 * @param {string} [props.to] - Makes the whole tile a link.
 * @returns {JSX.Element}
 */
import { Link } from 'react-router-dom';

const TONES = {
  primary: 'bg-primary-50 text-primary-600',
  success: 'bg-success-50 text-success-600',
  warning: 'bg-warning-50 text-warning-600',
  neutral: 'bg-gray-100 text-gray-500',
};

const StatCard = ({
  label,
  value,
  caption,
  icon: Icon,
  tone = 'primary',
  to,
}) => {
  const body = (
    <>
      <div className='flex items-start justify-between gap-3'>
        <p className='text-xs font-medium text-gray-500 uppercase tracking-wide mb-0'>
          {label}
        </p>
        {Icon && (
          <span
            className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${TONES[tone]}`}>
            <Icon className='h-4 w-4' aria-hidden='true' />
          </span>
        )}
      </div>
      <p className='mt-3 text-3xl font-bold text-gray-900 leading-none mb-0 tabular-nums'>
        {value}
      </p>
      {caption && <p className='mt-1.5 text-xs text-gray-500 mb-0'>{caption}</p>}
    </>
  );

  const classes =
    'block bg-white rounded-xl ring-1 ring-gray-200/80 shadow-sm p-5';

  if (to) {
    return (
      <Link
        to={to}
        className={`${classes} transition-shadow hover:shadow-md hover:ring-gray-300`}>
        {body}
      </Link>
    );
  }

  return <div className={classes}>{body}</div>;
};

export default StatCard;
