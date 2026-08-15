/**
 * Placeholder shown when a list has nothing to display.
 *
 * Several views previously rendered an empty grid with no explanation, which
 * reads as a broken page rather than an empty one.
 *
 * @param {Object} props
 * @param {React.ComponentType} [props.icon] - Illustrative icon.
 * @param {string} props.title - What is missing.
 * @param {string} [props.description] - Why, or what to do about it.
 * @param {React.ReactNode} [props.action] - Optional call to action.
 * @returns {JSX.Element}
 */
const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className='flex flex-col items-center justify-center text-center py-14 px-6 bg-white rounded-xl ring-1 ring-gray-200/80'>
    {Icon && (
      <div className='h-12 w-12 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center mb-4'>
        <Icon className='h-6 w-6' aria-hidden='true' />
      </div>
    )}
    <h3 className='text-base font-semibold text-gray-900 mb-1'>{title}</h3>
    {description && (
      <p className='text-sm text-gray-500 max-w-sm mb-0'>{description}</p>
    )}
    {action && <div className='mt-5'>{action}</div>}
  </div>
);

export default EmptyState;
