/**
 * Horizontal filter control with per-option counts.
 *
 * Rendered as a radio group rather than buttons so the current filter is
 * announced as a selection, and so arrow keys move between options the way a
 * keyboard user expects.
 *
 * @param {Object} props
 * @param {{ id: string, label: string, count?: number }[]} props.options
 * @param {string} props.value - Currently selected option id.
 * @param {(id: string) => void} props.onChange - Selection handler.
 * @param {string} props.label - Accessible name for the group.
 * @returns {JSX.Element}
 */
const FilterTabs = ({ options, value, onChange, label }) => (
  <div
    role='radiogroup'
    aria-label={label}
    className='inline-flex items-center gap-1 p-1 bg-gray-100 rounded-lg overflow-x-auto max-w-full'>
    {options.map((option) => {
      const selected = option.id === value;

      return (
        <button
          key={option.id}
          type='button'
          role='radio'
          aria-checked={selected}
          onClick={() => onChange(option.id)}
          className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            selected
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}>
          {option.label}
          {typeof option.count === 'number' && (
            <span
              className={`text-xs tabular-nums ${
                selected ? 'text-primary-600' : 'text-gray-400'
              }`}>
              {option.count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export default FilterTabs;
