import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';

/**
 * Standard page heading.
 *
 * Left-aligned and tight by design: the previous pages centred a large title
 * over a three-line paragraph, which pushed the actual content below the fold
 * on a laptop. The description is capped so it stays a subtitle, not an essay.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.title - Page title.
 * @param {React.ReactNode} [props.description] - One-line summary.
 * @param {React.ReactNode} [props.actions] - Trailing controls.
 * @param {{ to: string, label: string }} [props.back] - Back link.
 * @param {React.ReactNode} [props.meta] - Content rendered under the title.
 * @returns {JSX.Element}
 */
const PageHeader = ({ title, description, actions, back, meta }) => (
  <div className='mb-6'>
    {back && (
      <Link
        to={back.to}
        className='inline-flex items-center gap-1.5 mb-3 text-sm font-medium text-gray-500 hover:text-primary-600 transition-colors'>
        <FiArrowLeft className='w-4 h-4' aria-hidden='true' />
        {back.label}
      </Link>
    )}

    <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3'>
      <div className='min-w-0'>
        <h1 className='text-2xl md:text-3xl font-bold text-gray-900 mb-0 tracking-tight'>
          {title}
        </h1>
        {description && (
          <p className='mt-1.5 text-sm text-gray-600 max-w-2xl mb-0'>
            {description}
          </p>
        )}
        {meta && <div className='mt-3'>{meta}</div>}
      </div>

      {actions && (
        <div className='flex items-center gap-2 flex-shrink-0'>{actions}</div>
      )}
    </div>
  </div>
);

export default PageHeader;
